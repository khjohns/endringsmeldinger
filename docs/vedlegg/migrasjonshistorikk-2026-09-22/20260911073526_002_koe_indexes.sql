-- ============================================================
-- KOE indexes
-- ============================================================

CREATE INDEX idx_catenda_models_prosjekt ON public.catenda_models_cache USING btree (prosjekt_id);

CREATE INDEX idx_endringsordre_events_sak_id ON public.endringsordre_events USING btree (sak_id);

CREATE INDEX idx_forsering_events_sak_id ON public.forsering_events USING btree (sak_id);

CREATE INDEX idx_koe_events_sak_id ON public.koe_events USING btree (sak_id);
CREATE INDEX idx_koe_events_time ON public.koe_events USING btree ("time");

CREATE INDEX idx_magic_links_sak_id ON public.magic_links USING btree (sak_id);

CREATE INDEX idx_pm_email ON public.project_memberships USING btree (user_email);
CREATE INDEX idx_pm_external_id ON public.project_memberships USING btree (external_id) WHERE (external_id IS NOT NULL);
CREATE INDEX idx_pm_project ON public.project_memberships USING btree (project_id);

CREATE INDEX idx_projects_active ON public.projects USING btree (is_active) WHERE (is_active = true);

CREATE INDEX idx_sak_bim_links_fag ON public.sak_bim_links USING btree (fag);
CREATE INDEX idx_sak_bim_links_model ON public.sak_bim_links USING btree (model_id);
CREATE INDEX idx_sak_bim_links_sak ON public.sak_bim_links USING btree (sak_id);
CREATE UNIQUE INDEX idx_sak_bim_links_unique ON public.sak_bim_links USING btree (sak_id, fag, COALESCE(model_id, ''::text), COALESCE(object_global_id, ''::text));

CREATE INDEX idx_sak_metadata_prosjekt ON public.sak_metadata USING btree (prosjekt_id);

CREATE INDEX idx_sak_relations_source ON public.sak_relations USING btree (source_sak_id);
CREATE INDEX idx_sak_relations_target ON public.sak_relations USING btree (target_sak_id, relation_type);
CREATE INDEX idx_sak_relations_target_type ON public.sak_relations USING btree (target_sak_id, relation_type) INCLUDE (source_sak_id);

CREATE INDEX idx_user_groups_active ON public.user_groups USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_user_groups_approval_role ON public.user_groups USING btree (approval_role) WHERE (approval_role IS NOT NULL);
CREATE INDEX idx_user_groups_group_name ON public.user_groups USING btree (group_name);
CREATE INDEX idx_user_groups_manager_id ON public.user_groups USING btree (manager_id) WHERE (manager_id IS NOT NULL);
CREATE INDEX idx_user_groups_user_id ON public.user_groups USING btree (user_id);
CREATE INDEX idx_user_groups_user_role ON public.user_groups USING btree (user_role);
;
