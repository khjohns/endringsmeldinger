"""
Project Routes Blueprint

REST API for project management.

Endpoints:
- GET   /api/projects              - List active projects
- GET   /api/projects/<id>         - Get a single project
- POST  /api/projects              - Create a new project (auto-generated UUID)
- PATCH /api/projects/<id>         - Update project name/description (admin only)
- PATCH /api/projects/<id>/deactivate - Soft-delete project (admin only)
"""

import uuid

from flask import Blueprint, g, jsonify, request
from pydantic import ValidationError

from lib.auth.project_access import require_project_access
from lib.auth.session import dev_auth_disabled, get_auth_service, require_auth
from utils.logger import get_logger

logger = get_logger(__name__)

projects_bp = Blueprint("projects", __name__)


def _get_project_repo():
    """Get ProjectRepository from DI Container."""
    from core.container import get_container

    return get_container().project_repository


def _get_membership_repo():
    """Get MembershipRepository from DI Container."""
    from core.container import get_container

    return get_container().membership_repository


@projects_bp.route("/api/projects", methods=["GET"])
@require_auth
def list_projects():
    """List projects the current user has access to."""
    try:
        if dev_auth_disabled():
            projects = _get_project_repo().list_active()
        else:
            member_project_ids = set(get_auth_service().user_projects(g.user["id"]))
            all_projects = _get_project_repo().list_active()
            projects = [
                p for p in all_projects
                if p.id in member_project_ids
            ]

        return jsonify({
            "projects": [p.model_dump(mode="json") for p in projects]
        })
    except Exception as e:
        logger.error(f"Failed to list projects: {e}", exc_info=True)
        return jsonify(error="ACCESS_UNAVAILABLE", message="Tilgang kunne ikke bekreftes. Prøv igjen senere."), 503


@projects_bp.route("/api/projects/<project_id>", methods=["GET"])
@require_auth
@require_project_access()
def get_project(project_id: str):
    """Get a single project by ID."""
    try:
        project = _get_project_repo().get(project_id)
        if not project:
            return jsonify({"error": "NOT_FOUND", "message": "Prosjekt ikke funnet"}), 404
        return jsonify(project.model_dump(mode="json"))
    except Exception as e:
        logger.error(f"Failed to get project {project_id}: {e}", exc_info=True)
        return jsonify({"error": "INTERNAL_ERROR", "message": str(e)}), 500


@projects_bp.route("/api/projects", methods=["POST"])
@require_auth
def create_project():
    """Create a new project with server-generated UUID.

    Also adds the creator as admin member of the project.
    """
    if not dev_auth_disabled():
        return jsonify(error="FORBIDDEN", message="Prosjekter må registreres av systemansvarlig."), 403
    try:
        from models.project import CreateProjectRequest, Project
        from models.project_membership import ProjectMembership

        payload = request.json
        if not payload or not payload.get("name"):
            return jsonify({
                "error": "MISSING_PARAMETERS",
                "message": "name is required",
            }), 400

        # Validate request via Pydantic
        try:
            req = CreateProjectRequest(**payload)
        except ValidationError as e:
            return jsonify({
                "error": "VALIDATION_ERROR",
                "message": str(e),
            }), 400

        # Generate server-side UUID
        project_id = str(uuid.uuid4())
        email = g.user.get("email", "unknown")

        project = Project(
            id=project_id,
            name=req.name,
            description=req.description,
            settings=req.settings,
            created_by=email,
        )

        _get_project_repo().create(project)

        # Auto-add creator as admin member
        try:
            membership = ProjectMembership(
                project_id=project_id,
                user_email=email,
                role="admin",
                invited_by=email,
            )
            _get_membership_repo().add(membership)
        except Exception as membership_err:
            logger.warning(
                f"Failed to add creator as admin member for project {project_id}: {membership_err}"
            )

        logger.info(f"Project created: {project.id} by {email}")

        return jsonify({"success": True, "project": project.model_dump(mode="json")}), 201

    except Exception as e:
        logger.error(f"Failed to create project: {e}", exc_info=True)
        return jsonify({"error": "INTERNAL_ERROR", "message": str(e)}), 500


@projects_bp.route("/api/projects/<project_id>", methods=["PATCH"])
@require_auth
@require_project_access(min_role="admin")
def update_project(project_id: str):
    """Update a project's name and/or description. Requires admin role."""
    try:
        from models.project import UpdateProjectRequest

        payload = request.json
        if not payload:
            return jsonify({
                "error": "MISSING_PARAMETERS",
                "message": "Request body is required",
            }), 400

        # Validate request via Pydantic
        try:
            req = UpdateProjectRequest(**payload)
        except ValidationError as e:
            return jsonify({
                "error": "VALIDATION_ERROR",
                "message": str(e),
            }), 400

        # Build updates dict from explicitly provided fields
        updates = {}
        if "name" in req.model_fields_set:
            updates["name"] = req.name
        if "description" in req.model_fields_set:
            updates["description"] = req.description
        if "settings" in req.model_fields_set:
            # settings.contract feeds the authority matrix: the daily rate decides
            # whether a change order needs the chain at all. Project admin is not
            # the same authority as the employer's own team (audit RV-07).
            if isinstance(req.settings, dict) and "contract" in req.settings:
                from lib.auth.event_visibility import reader_contract_role

                if reader_contract_role() != "BH":
                    return jsonify({
                        "error": "CONTRACT_ROLE_REQUIRED",
                        "message": "Kontraktsinnstillinger endres av byggherrens team.",
                    }), 403
            updates["settings"] = req.settings

        if not updates:
            return jsonify({
                "error": "MISSING_PARAMETERS",
                "message": "At least one of name, description, or settings is required",
            }), 400

        updated_project = _get_project_repo().update(project_id, updates)
        if not updated_project:
            return jsonify({"error": "NOT_FOUND", "message": "Prosjekt ikke funnet"}), 404

        logger.info(f"Project updated: {project_id}")
        return jsonify({"success": True, "project": updated_project.model_dump(mode="json")})

    except Exception as e:
        logger.error(f"Failed to update project {project_id}: {e}", exc_info=True)
        return jsonify(
            {"error": "INTERNAL_ERROR", "message": "En uventet feil oppstod"}
        ), 500


@projects_bp.route("/api/projects/<project_id>/deactivate", methods=["PATCH"])
@require_auth
@require_project_access(min_role="admin")
def deactivate_project(project_id: str):
    """Soft-delete a project by setting is_active=false. Requires admin role."""
    try:
        deactivated = _get_project_repo().deactivate(project_id)
        if not deactivated:
            return jsonify({"error": "NOT_FOUND", "message": "Prosjekt ikke funnet"}), 404

        logger.info(f"Project deactivated: {project_id}")
        return jsonify({"success": True})

    except Exception as e:
        logger.error(f"Failed to deactivate project {project_id}: {e}", exc_info=True)
        return jsonify({"error": "INTERNAL_ERROR", "message": str(e)}), 500
