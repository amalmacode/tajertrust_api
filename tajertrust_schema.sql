--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

-- Started on 2026-03-09 09:46:34

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
-- TOC entry 5 (class 2615 OID 16839)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 4966 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- TOC entry 236 (class 1255 OID 16990)
-- Name: limit_admin_count(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.limit_admin_count() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    IF (
      SELECT COUNT(*) 
      FROM sellers 
      WHERE role = 'admin'
      AND id != COALESCE(NEW.id, -1)
    ) >= 3 THEN
      RAISE EXCEPTION 'Maximum number of admins (3) reached';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION public.limit_admin_count() OWNER TO postgres;

--
-- TOC entry 237 (class 1255 OID 16992)
-- Name: prevent_super_admin_delete(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.prevent_super_admin_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF OLD.role = 'super_admin' THEN
    RAISE EXCEPTION 'Super admin cannot be deleted';
  END IF;

  RETURN OLD;
END;
$$;


ALTER FUNCTION public.prevent_super_admin_delete() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 217 (class 1259 OID 16841)
-- Name: admin_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admin_messages (
    id integer NOT NULL,
    seller_id integer,
    subject text NOT NULL,
    message text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admin_messages OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 16847)
-- Name: admin_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admin_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admin_messages_id_seq OWNER TO postgres;

--
-- TOC entry 4968 (class 0 OID 0)
-- Dependencies: 218
-- Name: admin_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admin_messages_id_seq OWNED BY public.admin_messages.id;


--
-- TOC entry 219 (class 1259 OID 16848)
-- Name: admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admins (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password text NOT NULL
);


ALTER TABLE public.admins OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 16853)
-- Name: admins_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.admins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.admins_id_seq OWNER TO postgres;

--
-- TOC entry 4969 (class 0 OID 0)
-- Dependencies: 220
-- Name: admins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.admins_id_seq OWNED BY public.admins.id;


--
-- TOC entry 221 (class 1259 OID 16854)
-- Name: blacklist_reasons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blacklist_reasons (
    id integer NOT NULL,
    reason text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.blacklist_reasons OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 16860)
-- Name: blacklist_reasons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.blacklist_reasons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.blacklist_reasons_id_seq OWNER TO postgres;

--
-- TOC entry 4970 (class 0 OID 0)
-- Dependencies: 222
-- Name: blacklist_reasons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.blacklist_reasons_id_seq OWNED BY public.blacklist_reasons.id;


--
-- TOC entry 223 (class 1259 OID 16861)
-- Name: blacklisted_phones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.blacklisted_phones (
    id integer NOT NULL,
    phone character varying(20) NOT NULL,
    reason character varying(100) NOT NULL,
    seller_id integer,
    date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.blacklisted_phones OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 16865)
-- Name: blacklisted_phones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.blacklisted_phones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.blacklisted_phones_id_seq OWNER TO postgres;

--
-- TOC entry 4971 (class 0 OID 0)
-- Dependencies: 224
-- Name: blacklisted_phones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.blacklisted_phones_id_seq OWNED BY public.blacklisted_phones.id;


--
-- TOC entry 225 (class 1259 OID 16866)
-- Name: deletion_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.deletion_logs (
    id integer NOT NULL,
    admin_email character varying(255),
    reason text NOT NULL,
    deleted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    seller_email character varying(255)
);


ALTER TABLE public.deletion_logs OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 16872)
-- Name: deletion_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.deletion_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.deletion_logs_id_seq OWNER TO postgres;

--
-- TOC entry 4972 (class 0 OID 0)
-- Dependencies: 226
-- Name: deletion_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.deletion_logs_id_seq OWNED BY public.deletion_logs.id;


--
-- TOC entry 227 (class 1259 OID 16873)
-- Name: devalidation_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.devalidation_logs (
    id integer NOT NULL,
    seller_id integer,
    cause text NOT NULL,
    date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    admin_id integer
);


ALTER TABLE public.devalidation_logs OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 16879)
-- Name: devalidation_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.devalidation_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.devalidation_logs_id_seq OWNER TO postgres;

--
-- TOC entry 4973 (class 0 OID 0)
-- Dependencies: 228
-- Name: devalidation_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.devalidation_logs_id_seq OWNED BY public.devalidation_logs.id;


--
-- TOC entry 229 (class 1259 OID 16880)
-- Name: faq; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.faq (
    id integer NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.faq OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 16887)
-- Name: faq_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.faq_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.faq_id_seq OWNER TO postgres;

--
-- TOC entry 4974 (class 0 OID 0)
-- Dependencies: 230
-- Name: faq_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.faq_id_seq OWNED BY public.faq.id;


--
-- TOC entry 231 (class 1259 OID 16888)
-- Name: pending_registrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.pending_registrations (
    id integer NOT NULL,
    business_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    social_link text NOT NULL,
    website text,
    verification_token character varying(255),
    verify_code character varying(50),
    is_social_verified boolean DEFAULT false,
    instagram_username character varying(255),
    instagram_account_id character varying(255),
    instagram_page_name character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    expires_at timestamp without time zone DEFAULT (now() + '48:00:00'::interval)
);


ALTER TABLE public.pending_registrations OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 16896)
-- Name: pending_registrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.pending_registrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pending_registrations_id_seq OWNER TO postgres;

--
-- TOC entry 4975 (class 0 OID 0)
-- Dependencies: 232
-- Name: pending_registrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.pending_registrations_id_seq OWNED BY public.pending_registrations.id;


--
-- TOC entry 233 (class 1259 OID 16897)
-- Name: sellers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sellers (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255),
    social_link text,
    website text,
    is_email_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    verification_token text,
    is_validated boolean DEFAULT false,
    last_login timestamp without time zone,
    business_name character varying(255),
    reset_token character varying(255),
    reset_token_expires timestamp without time zone,
    profile_image character varying(255),
    verify_code character varying(20),
    is_social_verified boolean DEFAULT false,
    social_verified_at timestamp without time zone,
    instagram_username character varying(255),
    instagram_account_id character varying(255),
    instagram_account_type character varying(50),
    instagram_page_name character varying(255),
    instagram_followers_count integer,
    registration_method character varying(20) DEFAULT 'email'::character varying,
    email_verified_at timestamp without time zone,
    role character varying(20) DEFAULT 'user'::character varying NOT NULL,
    CONSTRAINT sellers_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'seller'::character varying, 'admin'::character varying, 'super_admin'::character varying])::text[])))
);


ALTER TABLE public.sellers OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 16907)
-- Name: sellers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sellers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sellers_id_seq OWNER TO postgres;

--
-- TOC entry 4976 (class 0 OID 0)
-- Dependencies: 234
-- Name: sellers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sellers_id_seq OWNED BY public.sellers.id;


--
-- TOC entry 235 (class 1259 OID 16908)
-- Name: session; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.session (
    sid character varying NOT NULL,
    sess json NOT NULL,
    expire timestamp(6) without time zone NOT NULL
);


ALTER TABLE public.session OWNER TO postgres;

--
-- TOC entry 4741 (class 2604 OID 16913)
-- Name: admin_messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_messages ALTER COLUMN id SET DEFAULT nextval('public.admin_messages_id_seq'::regclass);


--
-- TOC entry 4743 (class 2604 OID 16914)
-- Name: admins id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins ALTER COLUMN id SET DEFAULT nextval('public.admins_id_seq'::regclass);


--
-- TOC entry 4744 (class 2604 OID 16915)
-- Name: blacklist_reasons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blacklist_reasons ALTER COLUMN id SET DEFAULT nextval('public.blacklist_reasons_id_seq'::regclass);


--
-- TOC entry 4746 (class 2604 OID 16916)
-- Name: blacklisted_phones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blacklisted_phones ALTER COLUMN id SET DEFAULT nextval('public.blacklisted_phones_id_seq'::regclass);


--
-- TOC entry 4749 (class 2604 OID 16917)
-- Name: deletion_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deletion_logs ALTER COLUMN id SET DEFAULT nextval('public.deletion_logs_id_seq'::regclass);


--
-- TOC entry 4751 (class 2604 OID 16918)
-- Name: devalidation_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devalidation_logs ALTER COLUMN id SET DEFAULT nextval('public.devalidation_logs_id_seq'::regclass);


--
-- TOC entry 4753 (class 2604 OID 16919)
-- Name: faq id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faq ALTER COLUMN id SET DEFAULT nextval('public.faq_id_seq'::regclass);


--
-- TOC entry 4756 (class 2604 OID 16920)
-- Name: pending_registrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_registrations ALTER COLUMN id SET DEFAULT nextval('public.pending_registrations_id_seq'::regclass);


--
-- TOC entry 4760 (class 2604 OID 16921)
-- Name: sellers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sellers ALTER COLUMN id SET DEFAULT nextval('public.sellers_id_seq'::regclass);


--
-- TOC entry 4769 (class 2606 OID 16923)
-- Name: admin_messages admin_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_messages
    ADD CONSTRAINT admin_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4771 (class 2606 OID 16925)
-- Name: admins admins_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_email_key UNIQUE (email);


--
-- TOC entry 4773 (class 2606 OID 16927)
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- TOC entry 4775 (class 2606 OID 16929)
-- Name: blacklist_reasons blacklist_reasons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blacklist_reasons
    ADD CONSTRAINT blacklist_reasons_pkey PRIMARY KEY (id);


--
-- TOC entry 4779 (class 2606 OID 16931)
-- Name: blacklisted_phones blacklisted_phones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blacklisted_phones
    ADD CONSTRAINT blacklisted_phones_pkey PRIMARY KEY (id);


--
-- TOC entry 4784 (class 2606 OID 16933)
-- Name: deletion_logs deletion_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.deletion_logs
    ADD CONSTRAINT deletion_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4786 (class 2606 OID 16935)
-- Name: devalidation_logs devalidation_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devalidation_logs
    ADD CONSTRAINT devalidation_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4788 (class 2606 OID 16937)
-- Name: faq faq_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.faq
    ADD CONSTRAINT faq_pkey PRIMARY KEY (id);


--
-- TOC entry 4792 (class 2606 OID 16939)
-- Name: pending_registrations pending_registrations_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_registrations
    ADD CONSTRAINT pending_registrations_email_key UNIQUE (email);


--
-- TOC entry 4794 (class 2606 OID 16941)
-- Name: pending_registrations pending_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_registrations
    ADD CONSTRAINT pending_registrations_pkey PRIMARY KEY (id);


--
-- TOC entry 4796 (class 2606 OID 16943)
-- Name: pending_registrations pending_registrations_verify_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.pending_registrations
    ADD CONSTRAINT pending_registrations_verify_code_key UNIQUE (verify_code);


--
-- TOC entry 4801 (class 2606 OID 16945)
-- Name: sellers sellers_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_email_key UNIQUE (email);


--
-- TOC entry 4803 (class 2606 OID 16947)
-- Name: sellers sellers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT sellers_pkey PRIMARY KEY (id);


--
-- TOC entry 4809 (class 2606 OID 16949)
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (sid);


--
-- TOC entry 4782 (class 2606 OID 16995)
-- Name: blacklisted_phones unique_phone_per_seller; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blacklisted_phones
    ADD CONSTRAINT unique_phone_per_seller UNIQUE (phone, seller_id);


--
-- TOC entry 4777 (class 2606 OID 16953)
-- Name: blacklist_reasons unique_reason; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blacklist_reasons
    ADD CONSTRAINT unique_reason UNIQUE (reason);


--
-- TOC entry 4805 (class 2606 OID 16955)
-- Name: sellers unique_social; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sellers
    ADD CONSTRAINT unique_social UNIQUE (social_link);


--
-- TOC entry 4807 (class 1259 OID 16956)
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_session_expire" ON public.session USING btree (expire);


--
-- TOC entry 4780 (class 1259 OID 16957)
-- Name: idx_blacklisted_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_blacklisted_phone ON public.blacklisted_phones USING btree (phone);


--
-- TOC entry 4789 (class 1259 OID 16958)
-- Name: idx_pending_verification_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pending_verification_token ON public.pending_registrations USING btree (verification_token);


--
-- TOC entry 4790 (class 1259 OID 16959)
-- Name: idx_pending_verify_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_pending_verify_code ON public.pending_registrations USING btree (verify_code);


--
-- TOC entry 4797 (class 1259 OID 16960)
-- Name: idx_sellers_instagram_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sellers_instagram_id ON public.sellers USING btree (instagram_account_id);


--
-- TOC entry 4798 (class 1259 OID 16961)
-- Name: idx_sellers_registration_method; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sellers_registration_method ON public.sellers USING btree (registration_method);


--
-- TOC entry 4799 (class 1259 OID 16984)
-- Name: idx_sellers_verification_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sellers_verification_token ON public.sellers USING btree (verification_token);


--
-- TOC entry 4806 (class 1259 OID 16989)
-- Name: unique_super_admin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX unique_super_admin ON public.sellers USING btree (role) WHERE ((role)::text = 'super_admin'::text);


--
-- TOC entry 4814 (class 2620 OID 16991)
-- Name: sellers trigger_limit_admins; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_limit_admins BEFORE INSERT OR UPDATE ON public.sellers FOR EACH ROW EXECUTE FUNCTION public.limit_admin_count();


--
-- TOC entry 4815 (class 2620 OID 16993)
-- Name: sellers trigger_prevent_super_admin_delete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_prevent_super_admin_delete BEFORE DELETE ON public.sellers FOR EACH ROW EXECUTE FUNCTION public.prevent_super_admin_delete();


--
-- TOC entry 4810 (class 2606 OID 16962)
-- Name: admin_messages admin_messages_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admin_messages
    ADD CONSTRAINT admin_messages_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;


--
-- TOC entry 4811 (class 2606 OID 16967)
-- Name: blacklisted_phones blacklisted_phones_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.blacklisted_phones
    ADD CONSTRAINT blacklisted_phones_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;


--
-- TOC entry 4812 (class 2606 OID 16972)
-- Name: devalidation_logs devalidation_logs_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devalidation_logs
    ADD CONSTRAINT devalidation_logs_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;


--
-- TOC entry 4813 (class 2606 OID 16977)
-- Name: devalidation_logs fk_admin; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devalidation_logs
    ADD CONSTRAINT fk_admin FOREIGN KEY (admin_id) REFERENCES public.admins(id) ON DELETE SET NULL;


--
-- TOC entry 4967 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


-- Completed on 2026-03-09 09:46:34

--
-- PostgreSQL database dump complete
--

