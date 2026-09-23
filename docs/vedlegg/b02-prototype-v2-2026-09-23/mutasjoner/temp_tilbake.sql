-- RB2-02: midlertidige objekter tillatt for alle igjen.
DO $$ BEGIN
    EXECUTE format('GRANT TEMPORARY ON DATABASE %I TO PUBLIC', current_database());
END $$;
