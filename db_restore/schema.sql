--
-- PostgreSQL database dump
--

\restrict 5ObBlboMOt7nkdzqlUq9K6BvAvycmWu77DtEhUVbFRebJizVZIFUS2v8neXSeSf

-- Dumped from database version 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1)
-- Dumped by pg_dump version 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: btree_gist; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;


--
-- Name: EXTENSION btree_gist; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION btree_gist IS 'support for indexing common datatypes in GiST';


--
-- Name: postgis; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public;


--
-- Name: EXTENSION postgis; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION postgis IS 'PostGIS geometry and geography spatial types and functions';


--
-- Name: unaccent; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA public;


--
-- Name: EXTENSION unaccent; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION unaccent IS 'text search dictionary that removes accents';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: breeds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.breeds (
    id integer NOT NULL,
    name character varying NOT NULL
);


--
-- Name: breeds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.breeds ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.breeds_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: collars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collars (
    id integer NOT NULL,
    firmware_version character varying,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone,
    code smallint NOT NULL,
    mac character varying(12),
    params jsonb,
    firmware_code smallint,
    CONSTRAINT collars_code_check CHECK (((code >= 1) AND (code <= 255))),
    CONSTRAINT collars_firmware_code_check CHECK (((firmware_code >= 1) AND (firmware_code <= 255))),
    CONSTRAINT collars_firmware_version_check CHECK (((firmware_version)::text ~ '^\d+\.\d+\.\d+$'::text)),
    CONSTRAINT collars_mac_check CHECK (((mac)::text ~ '^[0-9a-f]{12}$'::text))
);


--
-- Name: collars_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.collars ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.collars_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: command_targets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.command_targets (
    id bigint NOT NULL,
    command_id integer NOT NULL,
    collar_id integer NOT NULL,
    status character varying(10) DEFAULT 'pending'::character varying NOT NULL,
    result character varying(12),
    gateway_id integer,
    deliveries smallint DEFAULT 0 NOT NULL,
    delivered_at timestamp with time zone,
    completed_at timestamp with time zone,
    CONSTRAINT command_targets_done_check CHECK ((((status)::text = 'done'::text) = (result IS NOT NULL))),
    CONSTRAINT command_targets_result_check CHECK (((result)::text = ANY ((ARRAY['ok'::character varying, 'duplicate'::character varying, 'badParams'::character varying, 'unsupported'::character varying, 'noAnswer'::character varying, 'canceled'::character varying])::text[]))),
    CONSTRAINT command_targets_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'delivered'::character varying, 'done'::character varying])::text[])))
);


--
-- Name: command_targets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.command_targets ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.command_targets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: commands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.commands (
    id integer NOT NULL,
    type character varying(20) NOT NULL,
    payload jsonb,
    target character varying(10) NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    canceled_at timestamp with time zone,
    CONSTRAINT commands_target_check CHECK (((target)::text = ANY ((ARRAY['collars'::character varying, 'all'::character varying])::text[]))),
    CONSTRAINT commands_type_check CHECK (((type)::text = ANY ((ARRAY['params'::character varying, 'resetParams'::character varying, 'diag'::character varying, 'reboot'::character varying, 'zone'::character varying, 'zoneClear'::character varying, 'ota'::character varying, 'otaCancel'::character varying, 'assignCode'::character varying])::text[])))
);


--
-- Name: commands_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.commands ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.commands_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cow_collar_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cow_collar_assignments (
    id integer NOT NULL,
    cow_id integer NOT NULL,
    collar_id integer NOT NULL,
    date_from timestamp with time zone NOT NULL,
    date_to timestamp with time zone
);


--
-- Name: cow_collar_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cow_collar_assignments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cow_collar_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cow_group_memberships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cow_group_memberships (
    id integer NOT NULL,
    cow_id integer NOT NULL,
    group_id integer NOT NULL,
    date_from timestamp with time zone NOT NULL,
    date_to timestamp with time zone
);


--
-- Name: cow_group_memberships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cow_group_memberships ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cow_group_memberships_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: cows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cows (
    id integer NOT NULL,
    breed_id integer,
    current_collar_id integer,
    ear_tag character varying DEFAULT 'S/N'::character varying,
    alias character varying,
    birth_date timestamp without time zone,
    image_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: cows_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cows ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cows_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: event_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.event_types (
    id integer NOT NULL,
    name character varying NOT NULL
);


--
-- Name: event_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.event_types ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.event_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.events (
    id bigint NOT NULL,
    event_type_id integer NOT NULL,
    cow_id integer,
    collar_id integer,
    position_id bigint,
    raw_rf_message_id bigint,
    zone_id integer,
    occurred_at timestamp with time zone NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: firmwares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.firmwares (
    id integer NOT NULL,
    code smallint NOT NULL,
    version character varying(20) NOT NULL,
    filename character varying NOT NULL,
    size integer NOT NULL,
    md5 character(32) NOT NULL,
    sha256 character(64) NOT NULL,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT firmwares_code_check CHECK (((code >= 1) AND (code <= 255))),
    CONSTRAINT firmwares_version_check CHECK (((version)::text ~ '^\d+\.\d+\.\d+$'::text))
);


--
-- Name: firmwares_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.firmwares ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.firmwares_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: gateways; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gateways (
    id integer NOT NULL,
    description character varying,
    api_key_hash character varying(64) NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gateways_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.gateways ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.gateways_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    name character varying NOT NULL,
    description character varying
);


--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.groups ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: invalid_reasons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invalid_reasons (
    id integer NOT NULL,
    description character varying NOT NULL
);


--
-- Name: invalid_reasons_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.invalid_reasons ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.invalid_reasons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.positions (
    id bigint NOT NULL,
    collar_id integer NOT NULL,
    cow_id integer,
    raw_rf_message_id bigint,
    zone_id integer,
    recorded_at timestamp with time zone NOT NULL,
    location public.geography(Point,4326) NOT NULL,
    speed real,
    accuracy real,
    signal_strength real,
    distance_to_previous real,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: positions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.positions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.positions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: raw_rf_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.raw_rf_messages (
    id bigint NOT NULL,
    invalid_reason_id integer,
    collar_code integer,
    recorded_at timestamp with time zone NOT NULL,
    location public.geography(Point,4326),
    altitude real,
    speed real,
    satellites_count integer,
    hdop real,
    voltage real,
    rssi real,
    snr real,
    crc character varying,
    gateway_id integer,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    type character varying(16),
    integrity character varying(16),
    raw character varying(128),
    seq smallint,
    data jsonb
);


--
-- Name: raw_rf_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.raw_rf_messages ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.raw_rf_messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id integer NOT NULL,
    user_id integer NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    rotated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    session_id uuid NOT NULL,
    ip inet
);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.refresh_tokens ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_used_at timestamp with time zone DEFAULT now() NOT NULL,
    created_ip inet,
    last_ip inet,
    user_agent character varying(512),
    revoked_at timestamp with time zone,
    revoked_reason character varying(16),
    CONSTRAINT user_sessions_revoked_check CHECK (((revoked_at IS NULL) = (revoked_reason IS NULL))),
    CONSTRAINT user_sessions_revoked_reason_check CHECK (((revoked_reason)::text = ANY ((ARRAY['logout'::character varying, 'reuse'::character varying, 'admin'::character varying, 'password'::character varying])::text[])))
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying NOT NULL,
    password character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    role integer NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.users ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: zone_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zone_types (
    id integer NOT NULL,
    name character varying NOT NULL
);


--
-- Name: zone_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.zone_types ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.zone_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: zones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zones (
    id integer NOT NULL,
    zone_type_id integer NOT NULL,
    name character varying NOT NULL,
    description text,
    polygon public.geography(Polygon,4326) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    deleted_at timestamp with time zone
);


--
-- Name: zones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.zones ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.zones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: breeds breeds_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.breeds
    ADD CONSTRAINT breeds_name_unique UNIQUE (name);


--
-- Name: breeds breeds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.breeds
    ADD CONSTRAINT breeds_pkey PRIMARY KEY (id);


--
-- Name: collars collars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collars
    ADD CONSTRAINT collars_pkey PRIMARY KEY (id);


--
-- Name: command_targets command_targets_command_collar_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.command_targets
    ADD CONSTRAINT command_targets_command_collar_key UNIQUE (command_id, collar_id);


--
-- Name: command_targets command_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.command_targets
    ADD CONSTRAINT command_targets_pkey PRIMARY KEY (id);


--
-- Name: commands commands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commands
    ADD CONSTRAINT commands_pkey PRIMARY KEY (id);


--
-- Name: cow_collar_assignments cow_collar_assignments_no_overlap_by_collar; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cow_collar_assignments
    ADD CONSTRAINT cow_collar_assignments_no_overlap_by_collar EXCLUDE USING gist (collar_id WITH =, tstzrange(date_from, date_to, '[)'::text) WITH &&);


--
-- Name: cow_collar_assignments cow_collar_assignments_no_overlap_by_cow; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cow_collar_assignments
    ADD CONSTRAINT cow_collar_assignments_no_overlap_by_cow EXCLUDE USING gist (cow_id WITH =, tstzrange(date_from, date_to, '[)'::text) WITH &&);


--
-- Name: cow_collar_assignments cow_collar_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cow_collar_assignments
    ADD CONSTRAINT cow_collar_assignments_pkey PRIMARY KEY (id);


--
-- Name: cow_group_memberships cow_group_memberships_no_overlap; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cow_group_memberships
    ADD CONSTRAINT cow_group_memberships_no_overlap EXCLUDE USING gist (cow_id WITH =, group_id WITH =, tstzrange(date_from, date_to, '[)'::text) WITH &&);


--
-- Name: cow_group_memberships cow_group_memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cow_group_memberships
    ADD CONSTRAINT cow_group_memberships_pkey PRIMARY KEY (id);


--
-- Name: cows cows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cows
    ADD CONSTRAINT cows_pkey PRIMARY KEY (id);


--
-- Name: event_types event_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_types
    ADD CONSTRAINT event_types_name_key UNIQUE (name);


--
-- Name: event_types event_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.event_types
    ADD CONSTRAINT event_types_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: firmwares firmwares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firmwares
    ADD CONSTRAINT firmwares_pkey PRIMARY KEY (id);


--
-- Name: gateways gateways_api_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gateways
    ADD CONSTRAINT gateways_api_key_hash_key UNIQUE (api_key_hash);


--
-- Name: gateways gateways_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gateways
    ADD CONSTRAINT gateways_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: invalid_reasons invalid_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invalid_reasons
    ADD CONSTRAINT invalid_reasons_pkey PRIMARY KEY (id);


--
-- Name: positions positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_pkey PRIMARY KEY (id);


--
-- Name: positions positions_raw_rf_message_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_raw_rf_message_id_key UNIQUE (raw_rf_message_id);


--
-- Name: raw_rf_messages raw_rf_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.raw_rf_messages
    ADD CONSTRAINT raw_rf_messages_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: zone_types zone_types_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone_types
    ADD CONSTRAINT zone_types_name_key UNIQUE (name);


--
-- Name: zone_types zone_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone_types
    ADD CONSTRAINT zone_types_pkey PRIMARY KEY (id);


--
-- Name: zones zones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_pkey PRIMARY KEY (id);


--
-- Name: collars_code_active_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX collars_code_active_key ON public.collars USING btree (code) WHERE (deleted_at IS NULL);


--
-- Name: collars_mac_active_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX collars_mac_active_key ON public.collars USING btree (mac) WHERE (deleted_at IS NULL);


--
-- Name: firmwares_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX firmwares_code_key ON public.firmwares USING btree (code);


--
-- Name: firmwares_version_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX firmwares_version_key ON public.firmwares USING btree (version);


--
-- Name: idx_command_targets_open; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_command_targets_open ON public.command_targets USING btree (collar_id) WHERE ((status)::text <> 'done'::text);


--
-- Name: idx_events_collar_occurred_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_collar_occurred_at ON public.events USING btree (collar_id, occurred_at);


--
-- Name: idx_events_type_occurred_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_events_type_occurred_at ON public.events USING btree (event_type_id, occurred_at);


--
-- Name: idx_positions_collar_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_collar_recorded_at ON public.positions USING btree (collar_id, recorded_at DESC);


--
-- Name: idx_positions_cow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_cow ON public.positions USING btree (cow_id);


--
-- Name: idx_positions_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_location ON public.positions USING gist (location);


--
-- Name: idx_positions_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_positions_recorded_at ON public.positions USING btree (recorded_at);


--
-- Name: idx_raw_rf_collar_code_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_raw_rf_collar_code_recorded_at ON public.raw_rf_messages USING btree (collar_code, recorded_at);


--
-- Name: idx_raw_rf_location; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_raw_rf_location ON public.raw_rf_messages USING gist (location);


--
-- Name: idx_raw_rf_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_raw_rf_pending ON public.raw_rf_messages USING btree (id) WHERE (processed_at IS NULL);


--
-- Name: idx_refresh_tokens_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refresh_tokens_session ON public.refresh_tokens USING btree (session_id);


--
-- Name: idx_user_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_sessions_user ON public.user_sessions USING btree (user_id);


--
-- Name: idx_zones_polygon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_zones_polygon ON public.zones USING gist (polygon);


--
-- Name: command_targets command_targets_collar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.command_targets
    ADD CONSTRAINT command_targets_collar_id_fkey FOREIGN KEY (collar_id) REFERENCES public.collars(id);


--
-- Name: command_targets command_targets_command_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.command_targets
    ADD CONSTRAINT command_targets_command_id_fkey FOREIGN KEY (command_id) REFERENCES public.commands(id) ON DELETE CASCADE;


--
-- Name: command_targets command_targets_gateway_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.command_targets
    ADD CONSTRAINT command_targets_gateway_id_fkey FOREIGN KEY (gateway_id) REFERENCES public.gateways(id);


--
-- Name: commands commands_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.commands
    ADD CONSTRAINT commands_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: cow_collar_assignments cow_collar_assignments_collar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cow_collar_assignments
    ADD CONSTRAINT cow_collar_assignments_collar_id_fkey FOREIGN KEY (collar_id) REFERENCES public.collars(id);


--
-- Name: cow_collar_assignments cow_collar_assignments_cow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cow_collar_assignments
    ADD CONSTRAINT cow_collar_assignments_cow_id_fkey FOREIGN KEY (cow_id) REFERENCES public.cows(id);


--
-- Name: cow_group_memberships cow_group_memberships_cow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cow_group_memberships
    ADD CONSTRAINT cow_group_memberships_cow_id_fkey FOREIGN KEY (cow_id) REFERENCES public.cows(id);


--
-- Name: cow_group_memberships cow_group_memberships_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cow_group_memberships
    ADD CONSTRAINT cow_group_memberships_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: cows cows_breed_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cows
    ADD CONSTRAINT cows_breed_id_fkey FOREIGN KEY (breed_id) REFERENCES public.breeds(id);


--
-- Name: cows cows_current_collar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cows
    ADD CONSTRAINT cows_current_collar_id_fkey FOREIGN KEY (current_collar_id) REFERENCES public.collars(id);


--
-- Name: events events_collar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_collar_id_fkey FOREIGN KEY (collar_id) REFERENCES public.collars(id);


--
-- Name: events events_cow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_cow_id_fkey FOREIGN KEY (cow_id) REFERENCES public.cows(id);


--
-- Name: events events_event_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES public.event_types(id);


--
-- Name: events events_position_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_position_id_fkey FOREIGN KEY (position_id) REFERENCES public.positions(id);


--
-- Name: events events_raw_rf_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_raw_rf_message_id_fkey FOREIGN KEY (raw_rf_message_id) REFERENCES public.raw_rf_messages(id);


--
-- Name: events events_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id);


--
-- Name: firmwares firmwares_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.firmwares
    ADD CONSTRAINT firmwares_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: positions positions_collar_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_collar_id_fkey FOREIGN KEY (collar_id) REFERENCES public.collars(id);


--
-- Name: positions positions_cow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_cow_id_fkey FOREIGN KEY (cow_id) REFERENCES public.cows(id);


--
-- Name: positions positions_raw_rf_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_raw_rf_message_id_fkey FOREIGN KEY (raw_rf_message_id) REFERENCES public.raw_rf_messages(id);


--
-- Name: positions positions_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.positions
    ADD CONSTRAINT positions_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id);


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.user_sessions(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: zones zones_zone_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_zone_type_id_fkey FOREIGN KEY (zone_type_id) REFERENCES public.zone_types(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 5ObBlboMOt7nkdzqlUq9K6BvAvycmWu77DtEhUVbFRebJizVZIFUS2v8neXSeSf

