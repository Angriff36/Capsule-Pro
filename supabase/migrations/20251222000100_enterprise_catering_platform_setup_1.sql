--
-- PostgreSQL database dump
--

-- Dumped from database version 16.3 (PGlite 0.2.0)
-- Dumped by pg_dump version 16.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'SQL_ASCII';
SET standard_conforming_strings = off;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET escape_string_warning = off;
SET row_security = off;

--
-- Name: core; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA core;


ALTER SCHEMA core OWNER TO postgres;

--
-- Name: meta; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA meta;


ALTER SCHEMA meta OWNER TO postgres;

--
-- Name: platform; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA platform;


ALTER SCHEMA platform OWNER TO postgres;

--
-- Name: tenant; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA tenant;


ALTER SCHEMA tenant OWNER TO postgres;

--
-- Name: tenant_admin; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA tenant_admin;


ALTER SCHEMA tenant_admin OWNER TO postgres;

--
-- Name: tenant_crm; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA tenant_crm;


ALTER SCHEMA tenant_crm OWNER TO postgres;

--
-- Name: tenant_events; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA tenant_events;


ALTER SCHEMA tenant_events OWNER TO postgres;

--
-- Name: tenant_inventory; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA tenant_inventory;


ALTER SCHEMA tenant_inventory OWNER TO postgres;

--
-- Name: tenant_kitchen; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA tenant_kitchen;


ALTER SCHEMA tenant_kitchen OWNER TO postgres;

--
-- Name: tenant_staff; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA tenant_staff;


ALTER SCHEMA tenant_staff OWNER TO postgres;

--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


--
-- Name: action_type; Type: TYPE; Schema: core; Owner: postgres
--

CREATE TYPE core.action_type AS ENUM (
    'insert',
    'update',
    'delete'
);


ALTER TYPE core.action_type OWNER TO postgres;

--
-- Name: employment_type; Type: TYPE; Schema: core; Owner: postgres
--

CREATE TYPE core.employment_type AS ENUM (
    'full_time',
    'part_time',
    'contractor',
    'temp'
);


ALTER TYPE core.employment_type OWNER TO postgres;

--
-- Name: unit_system; Type: TYPE; Schema: core; Owner: postgres
--

CREATE TYPE core.unit_system AS ENUM (
    'metric',
    'imperial',
    'custom'
);


ALTER TYPE core.unit_system OWNER TO postgres;

--
-- Name: unit_type; Type: TYPE; Schema: core; Owner: postgres
--

CREATE TYPE core.unit_type AS ENUM (
    'volume',
    'weight',
    'count',
    'length',
    'temperature',
    'time'
);


ALTER TYPE core.unit_type OWNER TO postgres;

--
-- Name: fn_audit_trigger(); Type: FUNCTION; Schema: core; Owner: postgres
--

CREATE FUNCTION core.fn_audit_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Stub function that will be implemented later
    RETURN NEW;
END;
$$;


ALTER FUNCTION core.fn_audit_trigger() OWNER TO postgres;

--
-- Name: fn_prevent_tenant_mutation(); Type: FUNCTION; Schema: core; Owner: postgres
--

CREATE FUNCTION core.fn_prevent_tenant_mutation() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF OLD.tenant_id != NEW.tenant_id THEN
        RAISE EXCEPTION 'tenant_id cannot be changed';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION core.fn_prevent_tenant_mutation() OWNER TO postgres;

--
-- Name: fn_to_tenant_time(timestamp with time zone, uuid, uuid); Type: FUNCTION; Schema: core; Owner: postgres
--

CREATE FUNCTION core.fn_to_tenant_time(ts timestamp with time zone, p_tenant_id uuid, p_location_id uuid DEFAULT NULL::uuid) RETURNS timestamp with time zone
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Stub function that will be implemented later
    -- For now, just return the input timestamp
    RETURN ts;
END;
$$;


ALTER FUNCTION core.fn_to_tenant_time(ts timestamp with time zone, p_tenant_id uuid, p_location_id uuid) OWNER TO postgres;

--
-- Name: fn_update_timestamp(); Type: FUNCTION; Schema: core; Owner: postgres
--

CREATE FUNCTION core.fn_update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION core.fn_update_timestamp() OWNER TO postgres;

--
-- Name: fn_validate_status_transition(text, text, text, text); Type: FUNCTION; Schema: core; Owner: postgres
--

CREATE FUNCTION core.fn_validate_status_transition(p_category text, p_from_status text, p_to_status text, p_user_role text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_requires_role text[];
BEGIN
    SELECT requires_role INTO v_requires_role
    FROM core.status_transitions
    WHERE category = p_category
      AND from_status_code = p_from_status
      AND to_status_code = p_to_status;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    IF v_requires_role IS NULL THEN
        RETURN TRUE;
    END IF;
    
    IF p_user_role = ANY(v_requires_role) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;


ALTER FUNCTION core.fn_validate_status_transition(p_category text, p_from_status text, p_to_status text, p_user_role text) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_config; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.audit_config (
    table_schema text NOT NULL,
    table_name text NOT NULL,
    audit_level text DEFAULT 'full'::text NOT NULL,
    excluded_columns text[]
);


ALTER TABLE core.audit_config OWNER TO postgres;

--
-- Name: status_transitions; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.status_transitions (
    id bigint NOT NULL,
    category text NOT NULL,
    from_status_code text,
    to_status_code text NOT NULL,
    requires_role text[],
    is_automatic boolean DEFAULT false NOT NULL
);


ALTER TABLE core.status_transitions OWNER TO postgres;

--
-- Name: status_transitions_id_seq; Type: SEQUENCE; Schema: core; Owner: postgres
--

ALTER TABLE core.status_transitions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME core.status_transitions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: status_types; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.status_types (
    id smallint NOT NULL,
    category text NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    description text,
    color_hex character(7),
    sort_order smallint DEFAULT 0 NOT NULL,
    is_terminal boolean DEFAULT false NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE core.status_types OWNER TO postgres;

--
-- Name: unit_conversions; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.unit_conversions (
    from_unit_id smallint NOT NULL,
    to_unit_id smallint NOT NULL,
    multiplier numeric(20,10) NOT NULL,
    CONSTRAINT unit_conversions_check CHECK ((from_unit_id <> to_unit_id))
);


ALTER TABLE core.unit_conversions OWNER TO postgres;

--
-- Name: units; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.units (
    id smallint NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    name_plural text NOT NULL,
    unit_system core.unit_system NOT NULL,
    unit_type core.unit_type NOT NULL,
    is_base_unit boolean DEFAULT false NOT NULL
);


ALTER TABLE core.units OWNER TO postgres;

--
-- Name: embeddings; Type: TABLE; Schema: meta; Owner: postgres
--

CREATE TABLE meta.embeddings (
    id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    content text NOT NULL,
    embedding public.vector(384) NOT NULL
);


ALTER TABLE meta.embeddings OWNER TO postgres;

--
-- Name: embeddings_id_seq; Type: SEQUENCE; Schema: meta; Owner: postgres
--

ALTER TABLE meta.embeddings ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME meta.embeddings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: migrations; Type: TABLE; Schema: meta; Owner: postgres
--

CREATE TABLE meta.migrations (
    version text NOT NULL,
    name text,
    applied_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE meta.migrations OWNER TO postgres;

--
-- Data for Name: audit_config; Type: TABLE DATA; Schema: core; Owner: postgres
--



--
-- Data for Name: status_transitions; Type: TABLE DATA; Schema: core; Owner: postgres
--

INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (1, 'task', NULL, 'pending', NULL, true);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (2, 'task', 'pending', 'assigned', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (3, 'task', 'assigned', 'in_progress', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (4, 'task', 'in_progress', 'paused', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (5, 'task', 'paused', 'in_progress', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (6, 'task', 'in_progress', 'completed', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (7, 'task', 'pending', 'cancelled', '{admin,manager}', false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (8, 'task', 'assigned', 'cancelled', '{admin,manager}', false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (9, 'task', 'paused', 'cancelled', '{admin,manager}', false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (10, 'event', NULL, 'draft', NULL, true);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (11, 'event', 'draft', 'confirmed', '{admin,manager}', false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (12, 'event', 'confirmed', 'in_progress', NULL, true);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (13, 'event', 'in_progress', 'completed', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (14, 'event', 'draft', 'cancelled', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (15, 'event', 'confirmed', 'cancelled', '{admin,manager}', false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (16, 'lead', NULL, 'new', NULL, true);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (17, 'lead', 'new', 'contacted', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (18, 'lead', 'contacted', 'qualified', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (19, 'lead', 'qualified', 'proposal_sent', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (20, 'lead', 'proposal_sent', 'won', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (21, 'lead', 'proposal_sent', 'lost', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (22, 'lead', 'new', 'lost', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (23, 'lead', 'contacted', 'lost', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (24, 'lead', 'qualified', 'lost', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (25, 'proposal', NULL, 'draft', NULL, true);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (26, 'proposal', 'draft', 'sent', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (27, 'proposal', 'sent', 'viewed', NULL, true);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (28, 'proposal', 'viewed', 'accepted', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (29, 'proposal', 'viewed', 'rejected', NULL, false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (30, 'proposal', 'sent', 'expired', NULL, true);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (31, 'proposal', 'viewed', 'expired', NULL, true);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (32, 'payroll', NULL, 'open', NULL, true);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (33, 'payroll', 'open', 'processing', '{admin,manager}', false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (34, 'payroll', 'processing', 'approved', '{admin}', false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (35, 'payroll', 'approved', 'paid', '{admin}', false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (36, 'payroll', 'processing', 'void', '{admin}', false);
INSERT INTO core.status_transitions OVERRIDING SYSTEM VALUE VALUES (37, 'payroll', 'approved', 'void', '{admin}', false);


--
-- Data for Name: status_types; Type: TABLE DATA; Schema: core; Owner: postgres
--

INSERT INTO core.status_types VALUES (1, 'task', 'pending', 'Pending', 'Task is waiting to be assigned', NULL, 10, false, true, true);
INSERT INTO core.status_types VALUES (2, 'task', 'assigned', 'Assigned', 'Task has been assigned to staff', NULL, 20, false, false, true);
INSERT INTO core.status_types VALUES (3, 'task', 'in_progress', 'In Progress', 'Task is currently being worked on', NULL, 30, false, false, true);
INSERT INTO core.status_types VALUES (4, 'task', 'paused', 'Paused', 'Task has been temporarily paused', NULL, 40, false, false, true);
INSERT INTO core.status_types VALUES (5, 'task', 'completed', 'Completed', 'Task has been completed', NULL, 50, true, false, true);
INSERT INTO core.status_types VALUES (6, 'task', 'cancelled', 'Cancelled', 'Task has been cancelled', NULL, 60, true, false, true);
INSERT INTO core.status_types VALUES (101, 'event', 'draft', 'Draft', 'Event is in draft stage', NULL, 10, false, true, true);
INSERT INTO core.status_types VALUES (102, 'event', 'confirmed', 'Confirmed', 'Event has been confirmed', NULL, 20, false, false, true);
INSERT INTO core.status_types VALUES (103, 'event', 'in_progress', 'In Progress', 'Event is currently in progress', NULL, 30, false, false, true);
INSERT INTO core.status_types VALUES (104, 'event', 'completed', 'Completed', 'Event has been completed', NULL, 40, true, false, true);
INSERT INTO core.status_types VALUES (105, 'event', 'cancelled', 'Cancelled', 'Event has been cancelled', NULL, 50, true, false, true);
INSERT INTO core.status_types VALUES (201, 'lead', 'new', 'New', 'New lead', NULL, 10, false, true, true);
INSERT INTO core.status_types VALUES (202, 'lead', 'contacted', 'Contacted', 'Lead has been contacted', NULL, 20, false, false, true);
INSERT INTO core.status_types VALUES (203, 'lead', 'qualified', 'Qualified', 'Lead has been qualified', NULL, 30, false, false, true);
INSERT INTO core.status_types VALUES (204, 'lead', 'proposal_sent', 'Proposal Sent', 'Proposal has been sent to lead', NULL, 40, false, false, true);
INSERT INTO core.status_types VALUES (205, 'lead', 'won', 'Won', 'Lead has been converted to client', NULL, 50, true, false, true);
INSERT INTO core.status_types VALUES (206, 'lead', 'lost', 'Lost', 'Lead has been lost', NULL, 60, true, false, true);
INSERT INTO core.status_types VALUES (301, 'proposal', 'draft', 'Draft', 'Proposal is in draft stage', NULL, 10, false, true, true);
INSERT INTO core.status_types VALUES (302, 'proposal', 'sent', 'Sent', 'Proposal has been sent to client', NULL, 20, false, false, true);
INSERT INTO core.status_types VALUES (303, 'proposal', 'viewed', 'Viewed', 'Proposal has been viewed by client', NULL, 30, false, false, true);
INSERT INTO core.status_types VALUES (304, 'proposal', 'accepted', 'Accepted', 'Proposal has been accepted', NULL, 40, true, false, true);
INSERT INTO core.status_types VALUES (305, 'proposal', 'rejected', 'Rejected', 'Proposal has been rejected', NULL, 50, true, false, true);
INSERT INTO core.status_types VALUES (306, 'proposal', 'expired', 'Expired', 'Proposal has expired', NULL, 60, true, false, true);
INSERT INTO core.status_types VALUES (401, 'payroll', 'open', 'Open', 'Payroll is open for entries', NULL, 10, false, true, true);
INSERT INTO core.status_types VALUES (402, 'payroll', 'processing', 'Processing', 'Payroll is being processed', NULL, 20, false, false, true);
INSERT INTO core.status_types VALUES (403, 'payroll', 'approved', 'Approved', 'Payroll has been approved', NULL, 30, false, false, true);
INSERT INTO core.status_types VALUES (404, 'payroll', 'paid', 'Paid', 'Payroll has been paid', NULL, 40, true, false, true);
INSERT INTO core.status_types VALUES (405, 'payroll', 'void', 'Void', 'Payroll has been voided', NULL, 50, true, false, true);


--
-- Data for Name: unit_conversions; Type: TABLE DATA; Schema: core; Owner: postgres
--

INSERT INTO core.unit_conversions VALUES (1, 2, 0.0010000000);
INSERT INTO core.unit_conversions VALUES (2, 1, 1000.0000000000);
INSERT INTO core.unit_conversions VALUES (10, 1, 236.5880000000);
INSERT INTO core.unit_conversions VALUES (1, 10, 0.0042267500);
INSERT INTO core.unit_conversions VALUES (11, 1, 14.7870000000);
INSERT INTO core.unit_conversions VALUES (1, 11, 0.0676280454);
INSERT INTO core.unit_conversions VALUES (12, 1, 4.9290000000);
INSERT INTO core.unit_conversions VALUES (1, 12, 0.2028841362);
INSERT INTO core.unit_conversions VALUES (13, 1, 29.5740000000);
INSERT INTO core.unit_conversions VALUES (1, 13, 0.0338135000);
INSERT INTO core.unit_conversions VALUES (14, 1, 3785.4100000000);
INSERT INTO core.unit_conversions VALUES (1, 14, 0.0002641720);
INSERT INTO core.unit_conversions VALUES (15, 1, 946.3530000000);
INSERT INTO core.unit_conversions VALUES (1, 15, 0.0010566900);
INSERT INTO core.unit_conversions VALUES (16, 1, 473.1760000000);
INSERT INTO core.unit_conversions VALUES (1, 16, 0.0021133800);
INSERT INTO core.unit_conversions VALUES (20, 21, 0.0010000000);
INSERT INTO core.unit_conversions VALUES (21, 20, 1000.0000000000);
INSERT INTO core.unit_conversions VALUES (30, 20, 28.3495000000);
INSERT INTO core.unit_conversions VALUES (20, 30, 0.0352739600);
INSERT INTO core.unit_conversions VALUES (31, 20, 453.5920000000);
INSERT INTO core.unit_conversions VALUES (20, 31, 0.0022046200);
INSERT INTO core.unit_conversions VALUES (41, 40, 12.0000000000);
INSERT INTO core.unit_conversions VALUES (40, 41, 0.0833333333);


--
-- Data for Name: units; Type: TABLE DATA; Schema: core; Owner: postgres
--

INSERT INTO core.units VALUES (1, 'ml', 'Milliliter', 'Milliliters', 'metric', 'volume', true);
INSERT INTO core.units VALUES (2, 'l', 'Liter', 'Liters', 'metric', 'volume', false);
INSERT INTO core.units VALUES (10, 'cup', 'Cup', 'Cups', 'imperial', 'volume', false);
INSERT INTO core.units VALUES (11, 'tbsp', 'Tablespoon', 'Tablespoons', 'imperial', 'volume', false);
INSERT INTO core.units VALUES (12, 'tsp', 'Teaspoon', 'Teaspoons', 'imperial', 'volume', false);
INSERT INTO core.units VALUES (13, 'fl_oz', 'Fluid Ounce', 'Fluid Ounces', 'imperial', 'volume', false);
INSERT INTO core.units VALUES (14, 'gal', 'Gallon', 'Gallons', 'imperial', 'volume', false);
INSERT INTO core.units VALUES (15, 'qt', 'Quart', 'Quarts', 'imperial', 'volume', false);
INSERT INTO core.units VALUES (16, 'pt', 'Pint', 'Pints', 'imperial', 'volume', false);
INSERT INTO core.units VALUES (20, 'g', 'Gram', 'Grams', 'metric', 'weight', true);
INSERT INTO core.units VALUES (21, 'kg', 'Kilogram', 'Kilograms', 'metric', 'weight', false);
INSERT INTO core.units VALUES (30, 'oz', 'Ounce', 'Ounces', 'imperial', 'weight', false);
INSERT INTO core.units VALUES (31, 'lb', 'Pound', 'Pounds', 'imperial', 'weight', false);
INSERT INTO core.units VALUES (40, 'each', 'Each', 'Each', 'custom', 'count', true);
INSERT INTO core.units VALUES (41, 'dozen', 'Dozen', 'Dozens', 'custom', 'count', false);
INSERT INTO core.units VALUES (50, 'celsius', 'Celsius', 'Celsius', 'metric', 'temperature', true);
INSERT INTO core.units VALUES (51, 'fahrenheit', 'Fahrenheit', 'Fahrenheit', 'imperial', 'temperature', false);


--
-- Data for Name: embeddings; Type: TABLE DATA; Schema: meta; Owner: postgres
--



--
-- Data for Name: migrations; Type: TABLE DATA; Schema: meta; Owner: postgres
--

INSERT INTO meta.migrations VALUES ('202407160001', 'embeddings', '2025-12-23 11:55:43.939+00');
INSERT INTO meta.migrations VALUES ('000001', 'foundation_schemas', '2025-12-23 13:04:17.566+00');
INSERT INTO meta.migrations VALUES ('000002', 'core_types', '2025-12-23 13:04:17.566+00');
INSERT INTO meta.migrations VALUES ('000003', 'core_tables', '2025-12-23 13:04:17.566+00');
INSERT INTO meta.migrations VALUES ('000004', 'core_functions', '2025-12-23 13:04:17.566+00');
INSERT INTO meta.migrations VALUES ('000005', 'status_types_seed', '2025-12-23 13:04:17.566+00');
INSERT INTO meta.migrations VALUES ('000006', 'units_seed', '2025-12-23 13:04:17.566+00');
INSERT INTO meta.migrations VALUES ('000007', 'unit_conversions_seed', '2025-12-23 13:04:17.566+00');
INSERT INTO meta.migrations VALUES ('000008', 'status_transitions_seed', '2025-12-23 13:04:17.566+00');


--
-- Name: status_transitions_id_seq; Type: SEQUENCE SET; Schema: core; Owner: postgres
--

SELECT pg_catalog.setval('core.status_transitions_id_seq', 37, true);


--
-- Name: embeddings_id_seq; Type: SEQUENCE SET; Schema: meta; Owner: postgres
--

SELECT pg_catalog.setval('meta.embeddings_id_seq', 1, false);


--
-- Name: audit_config audit_config_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.audit_config
    ADD CONSTRAINT audit_config_pkey PRIMARY KEY (table_schema, table_name);


--
-- Name: status_transitions status_transitions_category_from_status_code_to_status_code_key; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.status_transitions
    ADD CONSTRAINT status_transitions_category_from_status_code_to_status_code_key UNIQUE (category, from_status_code, to_status_code);


--
-- Name: status_transitions status_transitions_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.status_transitions
    ADD CONSTRAINT status_transitions_pkey PRIMARY KEY (id);


--
-- Name: status_types status_types_category_code_key; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.status_types
    ADD CONSTRAINT status_types_category_code_key UNIQUE (category, code);


--
-- Name: status_types status_types_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.status_types
    ADD CONSTRAINT status_types_pkey PRIMARY KEY (id);


--
-- Name: unit_conversions unit_conversions_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.unit_conversions
    ADD CONSTRAINT unit_conversions_pkey PRIMARY KEY (from_unit_id, to_unit_id);


--
-- Name: units units_code_key; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.units
    ADD CONSTRAINT units_code_key UNIQUE (code);


--
-- Name: units units_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.units
    ADD CONSTRAINT units_pkey PRIMARY KEY (id);


--
-- Name: embeddings embeddings_pkey; Type: CONSTRAINT; Schema: meta; Owner: postgres
--

ALTER TABLE ONLY meta.embeddings
    ADD CONSTRAINT embeddings_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: meta; Owner: postgres
--

ALTER TABLE ONLY meta.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (version);


--
-- Name: status_transitions fk_status_transitions_from_status; Type: FK CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.status_transitions
    ADD CONSTRAINT fk_status_transitions_from_status FOREIGN KEY (category, from_status_code) REFERENCES core.status_types(category, code) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: status_transitions fk_status_transitions_to_status; Type: FK CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.status_transitions
    ADD CONSTRAINT fk_status_transitions_to_status FOREIGN KEY (category, to_status_code) REFERENCES core.status_types(category, code) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED;


--
-- Name: unit_conversions unit_conversions_from_unit_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.unit_conversions
    ADD CONSTRAINT unit_conversions_from_unit_id_fkey FOREIGN KEY (from_unit_id) REFERENCES core.units(id);


--
-- Name: unit_conversions unit_conversions_to_unit_id_fkey; Type: FK CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.unit_conversions
    ADD CONSTRAINT unit_conversions_to_unit_id_fkey FOREIGN KEY (to_unit_id) REFERENCES core.units(id);


--
-- PostgreSQL database dump complete
--

