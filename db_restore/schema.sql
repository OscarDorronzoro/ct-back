--
-- PostgreSQL database dump
--

\restrict i3fwkFh3o7aV3PrFil2YTOqpd3nFOkULVX0k91fvhB0EgPcaz4gOnfsT8zBwgwJ

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
-- Name: dw; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA dw;


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
-- Name: dim_category; Type: TABLE; Schema: dw; Owner: -
--

CREATE TABLE dw.dim_category (
    category_id integer NOT NULL,
    name character varying NOT NULL,
    sex character varying NOT NULL
);


--
-- Name: dim_collar; Type: TABLE; Schema: dw; Owner: -
--

CREATE TABLE dw.dim_collar (
    collar_id integer NOT NULL,
    code integer,
    description character varying,
    firmware_version character varying,
    deleted boolean NOT NULL
);


--
-- Name: dim_cow; Type: TABLE; Schema: dw; Owner: -
--

CREATE TABLE dw.dim_cow (
    cow_id integer NOT NULL,
    ear_tag character varying,
    alias character varying,
    sex character varying,
    breed_id integer,
    breed_name character varying,
    birth_date date,
    deleted boolean NOT NULL
);


--
-- Name: dim_date; Type: TABLE; Schema: dw; Owner: -
--

CREATE TABLE dw.dim_date (
    date_key date NOT NULL,
    year integer NOT NULL,
    quarter integer NOT NULL,
    month integer NOT NULL,
    iso_year integer NOT NULL,
    iso_week integer NOT NULL,
    day_of_month integer NOT NULL,
    day_of_week integer NOT NULL
);


--
-- Name: dim_zone; Type: TABLE; Schema: dw; Owner: -
--

CREATE TABLE dw.dim_zone (
    zone_id integer NOT NULL,
    name character varying,
    zone_type character varying,
    area_m2 real,
    deleted boolean NOT NULL
);


--
-- Name: etl_runs; Type: TABLE; Schema: dw; Owner: -
--

CREATE TABLE dw.etl_runs (
    id integer NOT NULL,
    started_at timestamp with time zone NOT NULL,
    finished_at timestamp with time zone,
    stats jsonb,
    error character varying
);


--
-- Name: etl_runs_id_seq; Type: SEQUENCE; Schema: dw; Owner: -
--

ALTER TABLE dw.etl_runs ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME dw.etl_runs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: fact_battery_daily; Type: TABLE; Schema: dw; Owner: -
--

CREATE TABLE dw.fact_battery_daily (
    date_key date NOT NULL,
    collar_id integer NOT NULL,
    cow_id integer,
    readings integer NOT NULL,
    voltage_min real NOT NULL,
    voltage_median real NOT NULL,
    voltage_max real NOT NULL,
    voltage_dawn real,
    voltage_dawn_change real,
    percent integer NOT NULL
);


--
-- Name: COLUMN fact_battery_daily.voltage_dawn; Type: COMMENT; Schema: dw; Owner: -
--

COMMENT ON COLUMN dw.fact_battery_daily.voltage_dawn IS 'Median 3 to 5 am of the farm: battery at rest, without sun';


--
-- Name: COLUMN fact_battery_daily.voltage_dawn_change; Type: COMMENT; Schema: dw; Owner: -
--

COMMENT ON COLUMN dw.fact_battery_daily.voltage_dawn_change IS 'Against the previous dawn: > 0, the solar panel put back more than the collar used';


--
-- Name: COLUMN fact_battery_daily.percent; Type: COMMENT; Schema: dw; Owner: -
--

COMMENT ON COLUMN dw.fact_battery_daily.percent IS 'Estimate from the dawn voltage (median of the day without it) with the discharge curve of the backend';


--
-- Name: fact_daily_activity; Type: TABLE; Schema: dw; Owner: -
--

CREATE TABLE dw.fact_daily_activity (
    date_key date NOT NULL,
    cow_id integer NOT NULL,
    category_id integer,
    positions integer NOT NULL,
    raw_distance_m real NOT NULL,
    distance_m real NOT NULL,
    moving_min real NOT NULL,
    resting_min real NOT NULL
);


--
-- Name: COLUMN fact_daily_activity.category_id; Type: COMMENT; Schema: dw; Owner: -
--

COMMENT ON COLUMN dw.fact_daily_activity.category_id IS 'Category of the cow at the end of the day';


--
-- Name: COLUMN fact_daily_activity.raw_distance_m; Type: COMMENT; Schema: dw; Owner: -
--

COMMENT ON COLUMN dw.fact_daily_activity.raw_distance_m IS 'Sum of the distances between positions, GPS noise included';


--
-- Name: COLUMN fact_daily_activity.distance_m; Type: COMMENT; Schema: dw; Owner: -
--

COMMENT ON COLUMN dw.fact_daily_activity.distance_m IS 'Without the noise inside stops (stay points, radius 30 m)';


--
-- Name: fact_daily_weather; Type: TABLE; Schema: dw; Owner: -
--

CREATE TABLE dw.fact_daily_weather (
    date_key date NOT NULL,
    temperature_min real,
    temperature_max real,
    temperature_avg real,
    precipitation_mm real,
    humidity_avg real,
    wind_max_kmh real,
    gust_max_kmh real,
    hours integer NOT NULL
);


--
-- Name: fact_health_event; Type: TABLE; Schema: dw; Owner: -
--

CREATE TABLE dw.fact_health_event (
    event_id integer NOT NULL,
    cow_id integer NOT NULL,
    date_key date NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    type character varying NOT NULL,
    product_id integer,
    product_name character varying,
    product_type character varying,
    weight_kg real,
    temperature real,
    body_condition real
);


--
-- Name: fact_stop; Type: TABLE; Schema: dw; Owner: -
--

CREATE TABLE dw.fact_stop (
    id integer NOT NULL,
    cow_id integer NOT NULL,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone NOT NULL,
    duration_min real NOT NULL,
    center public.geography(Point,4326) NOT NULL,
    zone_id integer,
    positions integer NOT NULL
);


--
-- Name: fact_stop_id_seq; Type: SEQUENCE; Schema: dw; Owner: -
--

ALTER TABLE dw.fact_stop ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME dw.fact_stop_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: fact_zone_ndvi; Type: TABLE; Schema: dw; Owner: -
--

CREATE TABLE dw.fact_zone_ndvi (
    date_key date NOT NULL,
    zone_id integer NOT NULL,
    ndvi_mean real NOT NULL,
    ndvi_min real NOT NULL,
    ndvi_max real NOT NULL,
    valid_fraction real NOT NULL
);


--
-- Name: fact_zone_visit; Type: TABLE; Schema: dw; Owner: -
--

CREATE TABLE dw.fact_zone_visit (
    id integer NOT NULL,
    cow_id integer NOT NULL,
    zone_id integer NOT NULL,
    entered_at timestamp with time zone NOT NULL,
    left_at timestamp with time zone NOT NULL,
    duration_min real NOT NULL,
    positions integer NOT NULL
);


--
-- Name: fact_zone_visit_id_seq; Type: SEQUENCE; Schema: dw; Owner: -
--

ALTER TABLE dw.fact_zone_visit ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME dw.fact_zone_visit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: animal_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.animal_events (
    id integer NOT NULL,
    cow_id integer NOT NULL,
    type character varying NOT NULL,
    occurred_at timestamp with time zone NOT NULL,
    notes text,
    recorded_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    voided_at timestamp with time zone,
    voided_by integer,
    void_reason text,
    CONSTRAINT animal_events_type_check CHECK (((type)::text = ANY ((ARRAY['vaccination'::character varying, 'treatment'::character varying, 'examination'::character varying, 'weighing'::character varying, 'castration'::character varying])::text[]))),
    CONSTRAINT animal_events_void_reason CHECK (((voided_at IS NULL) = (void_reason IS NULL)))
);


--
-- Name: TABLE animal_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.animal_events IS 'Events of the animal entered by a person: the clinical history. Voided, never deleted';


--
-- Name: animal_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.animal_events ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.animal_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


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
-- Name: castrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.castrations (
    event_id integer NOT NULL,
    method character varying,
    CONSTRAINT castrations_method_check CHECK (((method)::text = ANY ((ARRAY['surgical'::character varying, 'band'::character varying, 'burdizzo'::character varying])::text[])))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying NOT NULL,
    sex character varying NOT NULL,
    CONSTRAINT categories_sex_check CHECK (((sex)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying])::text[])))
);


--
-- Name: TABLE categories; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.categories IS 'Cattle category (stage of the animal for its management), for a single sex';


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.categories ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.categories_id_seq
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
-- Name: cow_category_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cow_category_assignments (
    id integer NOT NULL,
    cow_id integer NOT NULL,
    category_id integer NOT NULL,
    date_from timestamp with time zone NOT NULL,
    date_to timestamp with time zone,
    source character varying NOT NULL,
    event_id integer,
    assigned_by integer,
    CONSTRAINT cow_category_assignments_check CHECK (((date_to IS NULL) OR (date_to >= date_from))),
    CONSTRAINT cow_category_assignments_source_check CHECK (((source)::text = ANY ((ARRAY['manual'::character varying, 'automatic'::character varying, 'event'::character varying])::text[])))
);


--
-- Name: TABLE cow_category_assignments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cow_category_assignments IS 'Category history of each cow; the current one is also cows.category_id';


--
-- Name: cow_category_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cow_category_assignments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.cow_category_assignments_id_seq
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
    deleted_at timestamp with time zone,
    sex character varying,
    category_id integer,
    CONSTRAINT cows_category_requires_sex CHECK (((category_id IS NULL) OR (sex IS NOT NULL))),
    CONSTRAINT cows_sex_check CHECK (((sex)::text = ANY ((ARRAY['male'::character varying, 'female'::character varying])::text[])))
);


--
-- Name: COLUMN cows.sex; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cows.sex IS 'male | female';


--
-- Name: COLUMN cows.category_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.cows.category_id IS 'Current category; must be for the sex of the cow';


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
-- Name: examinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.examinations (
    event_id integer NOT NULL,
    finding text,
    temperature real,
    body_condition real,
    CONSTRAINT examinations_body_condition_check CHECK (((body_condition >= (1)::double precision) AND (body_condition <= (5)::double precision)))
);


--
-- Name: COLUMN examinations.temperature; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.examinations.temperature IS '°C';


--
-- Name: COLUMN examinations.body_condition; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.examinations.body_condition IS 'Body condition score, 1 (very thin) to 5 (obese)';


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
-- Name: notification_cursor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification_cursor (
    id boolean DEFAULT true NOT NULL,
    last_event_id bigint NOT NULL,
    CONSTRAINT notification_cursor_id_check CHECK (id)
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
    updated_at timestamp with time zone DEFAULT now(),
    heading real
);


--
-- Name: COLUMN positions.speed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.speed IS 'km/h, average since the previous position of the collar';


--
-- Name: COLUMN positions.heading; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.positions.heading IS 'degrees clockwise from north, from the previous position; null under 10 m';


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
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name character varying NOT NULL,
    type character varying NOT NULL,
    meat_withdrawal_days integer DEFAULT 0 NOT NULL,
    milk_withdrawal_days integer DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT products_meat_withdrawal_days_check CHECK ((meat_withdrawal_days >= 0)),
    CONSTRAINT products_milk_withdrawal_days_check CHECK ((milk_withdrawal_days >= 0)),
    CONSTRAINT products_type_check CHECK (((type)::text = ANY ((ARRAY['vaccine'::character varying, 'drug'::character varying, 'antiparasitic'::character varying])::text[])))
);


--
-- Name: TABLE products; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.products IS 'Vaccines, drugs and antiparasitics used in vaccinations and treatments';


--
-- Name: COLUMN products.meat_withdrawal_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.meat_withdrawal_days IS 'Days after the last application before the meat can be sold';


--
-- Name: COLUMN products.milk_withdrawal_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.milk_withdrawal_days IS 'Days after the last application before the milk can be sold';


--
-- Name: COLUMN products.active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.products.active IS 'false: not offered for new events (recorded ones keep it)';


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.products ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.products_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id integer NOT NULL,
    user_id integer NOT NULL,
    session_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh character varying NOT NULL,
    auth character varying NOT NULL,
    user_agent character varying(512),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_sent_at timestamp with time zone
);


--
-- Name: TABLE push_subscriptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.push_subscriptions IS 'Devices that receive push notifications (Web Push); deleted when the push service says they are gone';


--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.push_subscriptions_id_seq
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
-- Name: treatments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treatments (
    event_id integer NOT NULL,
    product_id integer NOT NULL,
    diagnosis text,
    dose character varying,
    route character varying,
    duration_days integer DEFAULT 1 NOT NULL,
    meat_withdrawal_until timestamp with time zone,
    milk_withdrawal_until timestamp with time zone,
    CONSTRAINT treatments_duration_days_check CHECK ((duration_days >= 1))
);


--
-- Name: COLUMN treatments.duration_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.treatments.duration_days IS 'Days of application, starting on the day of the event';


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    user_id integer NOT NULL,
    role character varying NOT NULL,
    CONSTRAINT user_roles_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'manager'::character varying, 'veterinarian'::character varying, 'technician'::character varying, 'viewer'::character varying])::text[])))
);


--
-- Name: TABLE user_roles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.user_roles IS 'Roles of each user; a user has the union of the permissions of their roles';


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
    updated_at timestamp with time zone DEFAULT now()
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
-- Name: vaccinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vaccinations (
    event_id integer NOT NULL,
    product_id integer NOT NULL,
    dose character varying,
    batch character varying,
    route character varying,
    next_dose_on date,
    meat_withdrawal_until timestamp with time zone,
    milk_withdrawal_until timestamp with time zone
);


--
-- Name: weather_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weather_observations (
    id integer NOT NULL,
    observed_at timestamp with time zone NOT NULL,
    latitude real NOT NULL,
    longitude real NOT NULL,
    temperature real,
    apparent_temperature real,
    relative_humidity smallint,
    precipitation real,
    weather_code smallint,
    cloud_cover smallint,
    pressure real,
    wind_speed real,
    wind_gusts real,
    wind_direction smallint,
    source character varying NOT NULL,
    fetched_at timestamp with time zone NOT NULL
);


--
-- Name: TABLE weather_observations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.weather_observations IS 'Hourly weather at the center of the zones, from an external provider';


--
-- Name: COLUMN weather_observations.observed_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.weather_observations.observed_at IS 'End of the hour (UTC); precipitation is the sum of that hour';


--
-- Name: COLUMN weather_observations.temperature; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.weather_observations.temperature IS '°C at 2 m';


--
-- Name: COLUMN weather_observations.relative_humidity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.weather_observations.relative_humidity IS '%';


--
-- Name: COLUMN weather_observations.precipitation; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.weather_observations.precipitation IS 'mm in the hour';


--
-- Name: COLUMN weather_observations.weather_code; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.weather_observations.weather_code IS 'WMO weather interpretation code';


--
-- Name: COLUMN weather_observations.cloud_cover; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.weather_observations.cloud_cover IS '%';


--
-- Name: COLUMN weather_observations.pressure; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.weather_observations.pressure IS 'hPa at sea level';


--
-- Name: COLUMN weather_observations.wind_speed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.weather_observations.wind_speed IS 'km/h at 10 m';


--
-- Name: COLUMN weather_observations.wind_gusts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.weather_observations.wind_gusts IS 'km/h at 10 m';


--
-- Name: COLUMN weather_observations.wind_direction; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.weather_observations.wind_direction IS 'degrees the wind comes from';


--
-- Name: weather_observations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.weather_observations ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.weather_observations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: weighings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.weighings (
    event_id integer NOT NULL,
    weight_kg real NOT NULL,
    CONSTRAINT weighings_weight_kg_check CHECK ((weight_kg > (0)::double precision))
);


--
-- Name: zone_ndvi_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.zone_ndvi_observations (
    id integer NOT NULL,
    zone_id integer NOT NULL,
    acquired_on date NOT NULL,
    ndvi_mean real NOT NULL,
    ndvi_min real NOT NULL,
    ndvi_max real NOT NULL,
    ndvi_stdev real NOT NULL,
    valid_fraction real NOT NULL,
    pixels integer NOT NULL,
    source character varying NOT NULL,
    fetched_at timestamp with time zone NOT NULL,
    CONSTRAINT zone_ndvi_observations_valid_fraction_check CHECK (((valid_fraction >= (0)::double precision) AND (valid_fraction <= (1)::double precision)))
);


--
-- Name: TABLE zone_ndvi_observations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.zone_ndvi_observations IS 'NDVI of each zone per satellite image, clear pixels only (no clouds, shadows or water)';


--
-- Name: COLUMN zone_ndvi_observations.valid_fraction; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.zone_ndvi_observations.valid_fraction IS 'Part of the zone seen clear (0..1); images under 0.5 are not stored';


--
-- Name: zone_ndvi_observations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.zone_ndvi_observations ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.zone_ndvi_observations_id_seq
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
-- Name: dim_category dim_category_pkey; Type: CONSTRAINT; Schema: dw; Owner: -
--

ALTER TABLE ONLY dw.dim_category
    ADD CONSTRAINT dim_category_pkey PRIMARY KEY (category_id);


--
-- Name: dim_collar dim_collar_pkey; Type: CONSTRAINT; Schema: dw; Owner: -
--

ALTER TABLE ONLY dw.dim_collar
    ADD CONSTRAINT dim_collar_pkey PRIMARY KEY (collar_id);


--
-- Name: dim_cow dim_cow_pkey; Type: CONSTRAINT; Schema: dw; Owner: -
--

ALTER TABLE ONLY dw.dim_cow
    ADD CONSTRAINT dim_cow_pkey PRIMARY KEY (cow_id);


--
-- Name: dim_date dim_date_pkey; Type: CONSTRAINT; Schema: dw; Owner: -
--

ALTER TABLE ONLY dw.dim_date
    ADD CONSTRAINT dim_date_pkey PRIMARY KEY (date_key);


--
-- Name: dim_zone dim_zone_pkey; Type: CONSTRAINT; Schema: dw; Owner: -
--

ALTER TABLE ONLY dw.dim_zone
    ADD CONSTRAINT dim_zone_pkey PRIMARY KEY (zone_id);


--
-- Name: etl_runs etl_runs_pkey; Type: CONSTRAINT; Schema: dw; Owner: -
--

ALTER TABLE ONLY dw.etl_runs
    ADD CONSTRAINT etl_runs_pkey PRIMARY KEY (id);


--
-- Name: fact_battery_daily fact_battery_daily_pkey; Type: CONSTRAINT; Schema: dw; Owner: -
--

ALTER TABLE ONLY dw.fact_battery_daily
    ADD CONSTRAINT fact_battery_daily_pkey PRIMARY KEY (date_key, collar_id);


--
-- Name: fact_daily_activity fact_daily_activity_pkey; Type: CONSTRAINT; Schema: dw; Owner: -
--

ALTER TABLE ONLY dw.fact_daily_activity
    ADD CONSTRAINT fact_daily_activity_pkey PRIMARY KEY (date_key, cow_id);


--
-- Name: fact_daily_weather fact_daily_weather_pkey; Type: CONSTRAINT; Schema: dw; Owner: -
--

ALTER TABLE ONLY dw.fact_daily_weather
    ADD CONSTRAINT fact_daily_weather_pkey PRIMARY KEY (date_key);


--
-- Name: fact_health_event fact_health_event_pkey; Type: CONSTRAINT; Schema: dw; Owner: -
--

ALTER TABLE ONLY dw.fact_health_event
    ADD CONSTRAINT fact_health_event_pkey PRIMARY KEY (event_id);


--
-- Name: fact_stop fact_stop_pkey; Type: CONSTRAINT; Schema: dw; Owner: -
--

ALTER TABLE ONLY dw.fact_stop
    ADD CONSTRAINT fact_stop_pkey PRIMARY KEY (id);


--
-- Name: fact_zone_ndvi fact_zone_ndvi_pkey; Type: CONSTRAINT; Schema: dw; Owner: -
--

ALTER TABLE ONLY dw.fact_zone_ndvi
    ADD CONSTRAINT fact_zone_ndvi_pkey PRIMARY KEY (date_key, zone_id);


--
-- Name: fact_zone_visit fact_zone_visit_pkey; Type: CONSTRAINT; Schema: dw; Owner: -
--

ALTER TABLE ONLY dw.fact_zone_visit
    ADD CONSTRAINT fact_zone_visit_pkey PRIMARY KEY (id);


--
-- Name: animal_events animal_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animal_events
    ADD CONSTRAINT animal_events_pkey PRIMARY KEY (id);


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
-- Name: castrations castrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.castrations
    ADD CONSTRAINT castrations_pkey PRIMARY KEY (event_id);


--
-- Name: categories categories_id_sex_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_id_sex_key UNIQUE (id, sex);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


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
-- Name: cow_category_assignments cow_category_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cow_category_assignments
    ADD CONSTRAINT cow_category_assignments_pkey PRIMARY KEY (id);


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
-- Name: examinations examinations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examinations
    ADD CONSTRAINT examinations_pkey PRIMARY KEY (event_id);


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
-- Name: notification_cursor notification_cursor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification_cursor
    ADD CONSTRAINT notification_cursor_pkey PRIMARY KEY (id);


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
-- Name: products products_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_name_key UNIQUE (name);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


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
-- Name: treatments treatments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_pkey PRIMARY KEY (event_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role);


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
-- Name: vaccinations vaccinations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccinations
    ADD CONSTRAINT vaccinations_pkey PRIMARY KEY (event_id);


--
-- Name: weather_observations weather_observations_observed_at_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weather_observations
    ADD CONSTRAINT weather_observations_observed_at_key UNIQUE (observed_at);


--
-- Name: weather_observations weather_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weather_observations
    ADD CONSTRAINT weather_observations_pkey PRIMARY KEY (id);


--
-- Name: weighings weighings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weighings
    ADD CONSTRAINT weighings_pkey PRIMARY KEY (event_id);


--
-- Name: zone_ndvi_observations zone_ndvi_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone_ndvi_observations
    ADD CONSTRAINT zone_ndvi_observations_pkey PRIMARY KEY (id);


--
-- Name: zone_ndvi_observations zone_ndvi_observations_zone_id_acquired_on_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone_ndvi_observations
    ADD CONSTRAINT zone_ndvi_observations_zone_id_acquired_on_key UNIQUE (zone_id, acquired_on);


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
-- Name: idx_fact_daily_activity_cow; Type: INDEX; Schema: dw; Owner: -
--

CREATE INDEX idx_fact_daily_activity_cow ON dw.fact_daily_activity USING btree (cow_id, date_key);


--
-- Name: idx_fact_health_event_cow; Type: INDEX; Schema: dw; Owner: -
--

CREATE INDEX idx_fact_health_event_cow ON dw.fact_health_event USING btree (cow_id, date_key);


--
-- Name: idx_fact_stop_cow_started_at; Type: INDEX; Schema: dw; Owner: -
--

CREATE INDEX idx_fact_stop_cow_started_at ON dw.fact_stop USING btree (cow_id, started_at);


--
-- Name: idx_fact_zone_visit_cow_entered_at; Type: INDEX; Schema: dw; Owner: -
--

CREATE INDEX idx_fact_zone_visit_cow_entered_at ON dw.fact_zone_visit USING btree (cow_id, entered_at);


--
-- Name: idx_fact_zone_visit_zone_entered_at; Type: INDEX; Schema: dw; Owner: -
--

CREATE INDEX idx_fact_zone_visit_zone_entered_at ON dw.fact_zone_visit USING btree (zone_id, entered_at);


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
-- Name: idx_animal_events_cow_occurred_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_animal_events_cow_occurred_at ON public.animal_events USING btree (cow_id, occurred_at DESC);


--
-- Name: idx_command_targets_open; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_command_targets_open ON public.command_targets USING btree (collar_id) WHERE ((status)::text <> 'done'::text);


--
-- Name: idx_cow_category_assignments_cow; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cow_category_assignments_cow ON public.cow_category_assignments USING btree (cow_id, date_from);


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
-- Name: uq_cow_category_assignments_current; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_cow_category_assignments_current ON public.cow_category_assignments USING btree (cow_id) WHERE (date_to IS NULL);


--
-- Name: animal_events animal_events_cow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animal_events
    ADD CONSTRAINT animal_events_cow_id_fkey FOREIGN KEY (cow_id) REFERENCES public.cows(id);


--
-- Name: animal_events animal_events_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animal_events
    ADD CONSTRAINT animal_events_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: animal_events animal_events_voided_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.animal_events
    ADD CONSTRAINT animal_events_voided_by_fkey FOREIGN KEY (voided_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: castrations castrations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.castrations
    ADD CONSTRAINT castrations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.animal_events(id) ON DELETE CASCADE;


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
-- Name: cow_category_assignments cow_category_assignments_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cow_category_assignments
    ADD CONSTRAINT cow_category_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: cow_category_assignments cow_category_assignments_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cow_category_assignments
    ADD CONSTRAINT cow_category_assignments_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: cow_category_assignments cow_category_assignments_cow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cow_category_assignments
    ADD CONSTRAINT cow_category_assignments_cow_id_fkey FOREIGN KEY (cow_id) REFERENCES public.cows(id);


--
-- Name: cow_category_assignments cow_category_assignments_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cow_category_assignments
    ADD CONSTRAINT cow_category_assignments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.animal_events(id);


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
-- Name: cows cows_category_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cows
    ADD CONSTRAINT cows_category_fkey FOREIGN KEY (category_id, sex) REFERENCES public.categories(id, sex);


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
-- Name: examinations examinations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.examinations
    ADD CONSTRAINT examinations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.animal_events(id) ON DELETE CASCADE;


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
-- Name: push_subscriptions push_subscriptions_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.user_sessions(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


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
-- Name: treatments treatments_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.animal_events(id) ON DELETE CASCADE;


--
-- Name: treatments treatments_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treatments
    ADD CONSTRAINT treatments_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: vaccinations vaccinations_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccinations
    ADD CONSTRAINT vaccinations_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.animal_events(id) ON DELETE CASCADE;


--
-- Name: vaccinations vaccinations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vaccinations
    ADD CONSTRAINT vaccinations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: weighings weighings_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.weighings
    ADD CONSTRAINT weighings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.animal_events(id) ON DELETE CASCADE;


--
-- Name: zone_ndvi_observations zone_ndvi_observations_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zone_ndvi_observations
    ADD CONSTRAINT zone_ndvi_observations_zone_id_fkey FOREIGN KEY (zone_id) REFERENCES public.zones(id);


--
-- Name: zones zones_zone_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_zone_type_id_fkey FOREIGN KEY (zone_type_id) REFERENCES public.zone_types(id);


--
-- PostgreSQL database dump complete
--

\unrestrict i3fwkFh3o7aV3PrFil2YTOqpd3nFOkULVX0k91fvhB0EgPcaz4gOnfsT8zBwgwJ

