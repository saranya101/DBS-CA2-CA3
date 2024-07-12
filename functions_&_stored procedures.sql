--
-- PostgreSQL database dump
--

-- Dumped from database version 16.3
-- Dumped by pg_dump version 16.3

-- Started on 2024-07-12 14:54:27

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 262 (class 1255 OID 17223)
-- Name: compute_customer_lifetime_value(); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.compute_customer_lifetime_value()
    LANGUAGE plpgsql
    AS $$
DECLARE
    member_record RECORD;
    total_amount_spent DECIMAL;
    total_number_of_orders INT;
    first_order_date DATE;
    last_order_date DATE;
    customer_lifetime_days INT;
    customer_lifetime_years DECIMAL;
    average_purchase_value DECIMAL;
    purchase_frequency DECIMAL;
    calculated_clv DECIMAL;
BEGIN
    -- Loop through each member to compute and update CLV
    FOR member_record IN (SELECT id FROM member) LOOP
        -- Calculate total amount spent and total number of orders for each member
        SELECT 
            COALESCE(SUM(soi.quantity * p.unit_price), 0) AS total_amount_spent,
            COUNT(DISTINCT so.id) AS total_number_of_orders
        INTO 
            total_amount_spent,
            total_number_of_orders
        FROM 
            sale_order so
            JOIN sale_order_item soi ON so.id = soi.sale_order_id
            JOIN product p ON soi.product_id = p.id
        WHERE 
            so.member_id = member_record.id AND so.status = 'COMPLETED';

        -- Calculate first and last order dates for each member
        SELECT 
            MIN(so.order_datetime) AS first_order_date,
            MAX(so.order_datetime) AS last_order_date
        INTO 
            first_order_date,
            last_order_date
        FROM 
            sale_order so
        WHERE 
            so.member_id = member_record.id AND so.status = 'COMPLETED';

        -- Calculate customer lifetime in days
        IF first_order_date IS NOT NULL AND last_order_date IS NOT NULL THEN
            customer_lifetime_days := (last_order_date - first_order_date);
            -- Convert customer lifetime to years
            customer_lifetime_years := customer_lifetime_days / 365.0;
        ELSE
            customer_lifetime_years := NULL;
        END IF;

        -- Compute CLV if the customer has more than one order and a valid customer lifetime
        IF total_number_of_orders > 1 AND customer_lifetime_years IS NOT NULL THEN
            average_purchase_value := total_amount_spent / total_number_of_orders;
            purchase_frequency := total_number_of_orders / customer_lifetime_years;
            calculated_clv := average_purchase_value * purchase_frequency * 2; -- Retention period is assumed to be 2 years
        ELSE
            calculated_clv := NULL;
        END IF;

        -- Update the CLV column in the member table
        UPDATE member 
        SET clv = calculated_clv
        WHERE id = member_record.id;
    END LOOP;
END;
$$;


--
-- TOC entry 261 (class 1255 OID 17222)
-- Name: compute_running_total_spending(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.compute_running_total_spending() RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Debug: Notify function execution start
    RAISE NOTICE 'Starting compute_running_total_spending function';

    -- Update running_total_spending for recently active members
    UPDATE member m
    SET running_total_spending = (
        SELECT COALESCE(SUM(soi.quantity * p.unit_price), null)
        FROM sale_order so
        JOIN sale_order_item soi ON so.id = soi.sale_order_id
        JOIN product p ON soi.product_id = p.id
        WHERE so.member_id = m.id
        AND so.status = 'COMPLETED'
    )
    WHERE m.last_login_on > NOW() - INTERVAL '6 months';

    -- Debug: Notify after updating active members
    RAISE NOTICE 'Updated running_total_spending for active members';

    -- Set running_total_spending to NULL for members who are not recently active
    UPDATE member
    SET running_total_spending = NULL
    WHERE last_login_on <= NOW() - INTERVAL '6 months';

    -- Debug: Notify after setting NULL for inactive members
    RAISE NOTICE 'Set running_total_spending to NULL for inactive members';

END;
$$;


--
-- TOC entry 255 (class 1255 OID 17407)
-- Name: create_favourite_list(integer, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_favourite_list(p_member_id integer, p_list_name character varying) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if the list name already exists for the member
    IF EXISTS (
        SELECT 1
        FROM FavouriteLists
        WHERE member_id = p_member_id AND list_name = p_list_name
    ) THEN
        RAISE EXCEPTION 'List name already exists for this member';
    ELSE
        -- Insert the new favorite list
        INSERT INTO FavouriteLists (member_id, list_name)
        VALUES (p_member_id, p_list_name);
    END IF;
END;
$$;


--
-- TOC entry 256 (class 1255 OID 17431)
-- Name: create_review(integer, integer, text, integer); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.create_review(IN p_productid integer, IN p_memberid integer, IN p_reviewtext text, IN p_rating integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if the rating is within the valid range
    IF p_rating < 1 OR p_rating > 5 THEN
        RAISE EXCEPTION 'Rating must be between 1 and 5';
    END IF;
    
    -- Check if the member has purchased the product
    IF NOT EXISTS (
        SELECT 1
        FROM sale_order so
        JOIN sale_order_item soi ON so.id = soi.sale_order_id
        WHERE soi.product_id = p_productId
        AND so.member_id = p_memberId
        AND so.status = 'COMPLETED' -- Assuming only completed orders are valid for review
    ) THEN
        RAISE EXCEPTION 'Member has not purchased this product.';
    END IF;

    -- Insert the review into the Reviews table
    BEGIN
        INSERT INTO Reviews (productId, memberId, reviewText, rating, createdAt, updatedAt)
        VALUES (p_productId, p_memberId, p_reviewText, p_rating, NOW(), NOW());
    EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'Review for this product already exists! Cannot create duplicate.';
    END;
END;
$$;


--
-- TOC entry 238 (class 1255 OID 17418)
-- Name: delete_list(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_list(p_list_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- First, delete any related items from the favouritelistitems table
    DELETE FROM favouritelistitems WHERE list_id = p_list_id;
    
    -- Then, delete the list from the favouritelists table
    DELETE FROM favouritelists WHERE list_id = p_list_id;
END;
$$;


--
-- TOC entry 237 (class 1255 OID 17221)
-- Name: delete_review(integer); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.delete_review(IN p_reviewid integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM reviews
    WHERE reviewid = p_reviewid;

    -- Optionally, you can include an additional check to confirm the deletion
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Review with id % does not exist', review_id;
    END IF;
END;
$$;


--
-- TOC entry 250 (class 1255 OID 17236)
-- Name: get_age_group_spending(character varying, numeric, numeric); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_age_group_spending(gender_filter character varying DEFAULT NULL::character varying, min_group_total_spending numeric DEFAULT 0, min_member_total_spending numeric DEFAULT 0) RETURNS TABLE(age_group character varying, total_spending numeric, num_members integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    WITH age_group_data AS (
        SELECT 
            CASE
                WHEN DATE_PART('year', AGE(m.dob)) BETWEEN 18 AND 29 THEN '18-29'
                WHEN DATE_PART('year', AGE(m.dob)) BETWEEN 30 AND 39 THEN '30-39'
                WHEN DATE_PART('year', AGE(m.dob)) BETWEEN 40 AND 49 THEN '40-49'
                WHEN DATE_PART('year', AGE(m.dob)) BETWEEN 50 AND 59 THEN '50-59'
                ELSE 'Other'
            END::VARCHAR AS age_group,
            m.id AS member_id,
            m.gender,
            SUM(soi.quantity * p.unit_price) AS member_total_spending
        FROM 
            member m
        JOIN 
            sale_order so ON m.id = so.member_id
        JOIN 
            sale_order_item soi ON so.id = soi.sale_order_id
        JOIN 
            product p ON soi.product_id = p.id
        GROUP BY 
            age_group, m.id, m.gender
    )
    SELECT 
        agd.age_group,
        SUM(agd.member_total_spending) AS total_spending,
        COUNT(DISTINCT agd.member_id)::INT AS num_members
    FROM 
        age_group_data agd
    WHERE 
        (gender_filter IS NULL OR agd.gender = gender_filter)
        AND agd.member_total_spending >= min_member_total_spending
    GROUP BY 
        agd.age_group
    HAVING 
        SUM(agd.member_total_spending) >= min_group_total_spending;
END;
$$;


--
-- TOC entry 258 (class 1255 OID 17428)
-- Name: get_all_reviews(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_all_reviews(p_member_id integer) RETURNS TABLE(reviewid integer, memberid integer, productid integer, productname character varying, reviewtext text, rating integer, updatedat timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT r.reviewid, r.memberid, r.productid, p.name AS productname, r.reviewtext, r.rating, r.updatedat 
    FROM reviews r
    JOIN product p ON r.productid = p.id
    WHERE r.memberid = p_member_id;
END;
$$;


--
-- TOC entry 253 (class 1255 OID 17467)
-- Name: get_favourite_lists(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_favourite_lists(p_member_id integer) RETURNS TABLE(list_id integer, list_name character varying, created_at timestamp without time zone, updated_at timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT fl.list_id, fl.list_name, fl.created_at, fl.updated_at
    FROM favouritelists fl
    WHERE fl.member_id = p_member_id;
END;
$$;


--
-- TOC entry 263 (class 1255 OID 17469)
-- Name: get_products_in_list(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_products_in_list(p_list_id integer) RETURNS TABLE(list_item_id integer, list_name character varying, product_id integer, product_name character varying, product_description text, product_unit_price numeric, product_stock_quantity numeric, product_country character varying, product_type character varying, product_image_url character varying, product_manufactured_on timestamp without time zone, added_at timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        fli.list_item_id,
        fl.list_name,
        fli.product_id,
        p.name AS product_name,
        p.description AS product_description,
        p.unit_price AS product_unit_price,
        p.stock_quantity AS product_stock_quantity,
        p.country AS product_country,
        p.product_type AS product_type,
        p.image_url AS product_image_url,
        p.manufactured_on AS product_manufactured_on,
        fli.added_at
    FROM
        favouritelistitems fli
    JOIN
        favouritelists fl ON fli.list_id = fl.list_id
    JOIN
        product p ON fli.product_id = p.id
    WHERE
        fli.list_id = p_list_id;
END;
$$;


--
-- TOC entry 260 (class 1255 OID 17433)
-- Name: get_review(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_review(p_review_id integer) RETURNS TABLE(reviewid integer, memberid integer, productid integer, productname character varying, reviewtext text, rating integer, createdat timestamp without time zone, updatedat timestamp without time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT r.reviewid, r.memberid, r.productid, p.name AS productname, r.reviewtext, r.rating, r.createdat, r.updatedat 
    FROM reviews r
    JOIN product p ON r.productid = p.id
    WHERE r.reviewid = p_review_id;
END;
$$;


--
-- TOC entry 254 (class 1255 OID 17468)
-- Name: getlistswithcounts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.getlistswithcounts() RETURNS TABLE(list_id integer, list_name character varying, updated_at timestamp without time zone, product_count integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.list_id,
        f.list_name,
        f.updated_at,
        COUNT(fli.product_id)::INTEGER AS product_count -- Cast to INTEGER
    FROM 
        favouritelists f
    LEFT JOIN 
        favouritelistitems fli
    ON 
        f.list_id = fli.list_id
    GROUP BY 
        f.list_id, f.list_name, f.updated_at;
END;
$$;


--
-- TOC entry 252 (class 1255 OID 17411)
-- Name: insert_product_into_list(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.insert_product_into_list(p_product_id integer, p_list_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if the list exists
    IF NOT EXISTS (SELECT 1 FROM favouritelists WHERE list_id = p_list_id) THEN
        RAISE EXCEPTION 'List with ID % does not exist', p_list_id;
    END IF;

    -- Check if the product is already in the list
    IF EXISTS (SELECT 1 FROM favouritelistitems WHERE product_id = p_product_id AND list_id = p_list_id) THEN
        RAISE EXCEPTION 'Product with ID % is already in list with ID %', p_product_id, p_list_id;
    END IF;

    -- Insert the product into the list
    INSERT INTO favouritelistitems (product_id, list_id, added_at)
    VALUES (p_product_id, p_list_id, NOW());
END;
$$;


--
-- TOC entry 257 (class 1255 OID 17426)
-- Name: remove_product_from_list(integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.remove_product_from_list(p_list_id integer, p_product_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    DELETE FROM favouritelistitems
    WHERE list_id = p_list_id AND product_id = p_product_id;
END;
$$;


--
-- TOC entry 251 (class 1255 OID 17417)
-- Name: update_list_name(integer, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_list_name(p_list_id integer, p_list_name character varying) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE favouritelists
    SET list_name = p_list_name,
        updated_at = CURRENT_TIMESTAMP
    WHERE list_id = p_list_id;
    
    -- You might want to handle the case where the list_id does not exist
    -- Optionally you could raise an exception or handle it differently
    IF NOT FOUND THEN
        RAISE NOTICE 'List with id % not found.', p_list_id;
    END IF;
END;
$$;


--
-- TOC entry 259 (class 1255 OID 17432)
-- Name: update_review(integer, integer, text); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.update_review(IN p_reviewid integer, IN p_rating integer, IN p_reviewtext text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if the review exists
    IF NOT EXISTS (
        SELECT 1
        FROM reviews
        WHERE reviewid = p_reviewid
    ) THEN
        RAISE EXCEPTION 'Review with ID % does not exist.', p_reviewid;
    END IF;

    -- Update the review
    UPDATE reviews
    SET rating = p_rating, reviewtext = p_reviewtext, updatedat = NOW()
    WHERE reviewid = p_reviewid;
END;
$$;


--
-- TOC entry 234 (class 1259 OID 17386)
-- Name: favouritelistitems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favouritelistitems (
    list_item_id integer NOT NULL,
    list_id integer NOT NULL,
    product_id integer NOT NULL,
    added_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 233 (class 1259 OID 17385)
-- Name: favouritelistitems_list_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.favouritelistitems_list_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4943 (class 0 OID 0)
-- Dependencies: 233
-- Name: favouritelistitems_list_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.favouritelistitems_list_item_id_seq OWNED BY public.favouritelistitems.list_item_id;


--
-- TOC entry 232 (class 1259 OID 17374)
-- Name: favouritelists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favouritelists (
    list_id integer NOT NULL,
    member_id integer NOT NULL,
    list_name character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 231 (class 1259 OID 17373)
-- Name: favouritelists_list_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.favouritelists_list_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4944 (class 0 OID 0)
-- Dependencies: 231
-- Name: favouritelists_list_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.favouritelists_list_id_seq OWNED BY public.favouritelists.list_id;


--
-- TOC entry 221 (class 1259 OID 17054)
-- Name: member; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(50) NOT NULL,
    dob date NOT NULL,
    password character varying(255) NOT NULL,
    role integer NOT NULL,
    gender character(1) NOT NULL,
    last_login_on timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    clv numeric(10,3),
    running_total_spending numeric(10,3)
);


--
-- TOC entry 222 (class 1259 OID 17058)
-- Name: member_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.member_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4945 (class 0 OID 0)
-- Dependencies: 222
-- Name: member_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.member_id_seq OWNED BY public.member.id;


--
-- TOC entry 223 (class 1259 OID 17059)
-- Name: member_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_role (
    id integer NOT NULL,
    name character varying(25)
);


--
-- TOC entry 224 (class 1259 OID 17062)
-- Name: member_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.member_role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4946 (class 0 OID 0)
-- Dependencies: 224
-- Name: member_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.member_role_id_seq OWNED BY public.member_role.id;


--
-- TOC entry 225 (class 1259 OID 17063)
-- Name: product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product (
    id integer NOT NULL,
    name character varying(255),
    description text,
    unit_price numeric NOT NULL,
    stock_quantity numeric DEFAULT 0 NOT NULL,
    country character varying(100),
    product_type character varying(50),
    image_url character varying(255) DEFAULT '/images/product.png'::character varying,
    manufactured_on timestamp without time zone
);


--
-- TOC entry 226 (class 1259 OID 17070)
-- Name: product_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.product_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4947 (class 0 OID 0)
-- Dependencies: 226
-- Name: product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_id_seq OWNED BY public.product.id;


--
-- TOC entry 236 (class 1259 OID 17441)
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    reviewid integer NOT NULL,
    productid integer NOT NULL,
    memberid integer NOT NULL,
    reviewtext text NOT NULL,
    rating integer NOT NULL,
    createdat timestamp without time zone DEFAULT now(),
    updatedat timestamp without time zone DEFAULT now(),
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- TOC entry 235 (class 1259 OID 17440)
-- Name: reviews_reviewid_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reviews_reviewid_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4948 (class 0 OID 0)
-- Dependencies: 235
-- Name: reviews_reviewid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_reviewid_seq OWNED BY public.reviews.reviewid;


--
-- TOC entry 227 (class 1259 OID 17071)
-- Name: sale_order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_order (
    id integer NOT NULL,
    member_id integer,
    order_datetime timestamp without time zone NOT NULL,
    status character varying(10)
);


--
-- TOC entry 228 (class 1259 OID 17074)
-- Name: sale_order_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sale_order_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4949 (class 0 OID 0)
-- Dependencies: 228
-- Name: sale_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sale_order_id_seq OWNED BY public.sale_order.id;


--
-- TOC entry 229 (class 1259 OID 17075)
-- Name: sale_order_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_order_item (
    id integer NOT NULL,
    sale_order_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric NOT NULL
);


--
-- TOC entry 230 (class 1259 OID 17080)
-- Name: sale_order_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sale_order_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 4950 (class 0 OID 0)
-- Dependencies: 230
-- Name: sale_order_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sale_order_item_id_seq OWNED BY public.sale_order_item.id;


--
-- TOC entry 4756 (class 2604 OID 17389)
-- Name: favouritelistitems list_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favouritelistitems ALTER COLUMN list_item_id SET DEFAULT nextval('public.favouritelistitems_list_item_id_seq'::regclass);


--
-- TOC entry 4753 (class 2604 OID 17377)
-- Name: favouritelists list_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favouritelists ALTER COLUMN list_id SET DEFAULT nextval('public.favouritelists_list_id_seq'::regclass);


--
-- TOC entry 4745 (class 2604 OID 17081)
-- Name: member id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member ALTER COLUMN id SET DEFAULT nextval('public.member_id_seq'::regclass);


--
-- TOC entry 4747 (class 2604 OID 17082)
-- Name: member_role id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_role ALTER COLUMN id SET DEFAULT nextval('public.member_role_id_seq'::regclass);


--
-- TOC entry 4748 (class 2604 OID 17083)
-- Name: product id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product ALTER COLUMN id SET DEFAULT nextval('public.product_id_seq'::regclass);


--
-- TOC entry 4758 (class 2604 OID 17444)
-- Name: reviews reviewid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews ALTER COLUMN reviewid SET DEFAULT nextval('public.reviews_reviewid_seq'::regclass);


--
-- TOC entry 4751 (class 2604 OID 17084)
-- Name: sale_order id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order ALTER COLUMN id SET DEFAULT nextval('public.sale_order_id_seq'::regclass);


--
-- TOC entry 4752 (class 2604 OID 17085)
-- Name: sale_order_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order_item ALTER COLUMN id SET DEFAULT nextval('public.sale_order_item_id_seq'::regclass);


--
-- TOC entry 4779 (class 2606 OID 17394)
-- Name: favouritelistitems favouritelistitems_list_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favouritelistitems
    ADD CONSTRAINT favouritelistitems_list_id_product_id_key UNIQUE (list_id, product_id);


--
-- TOC entry 4781 (class 2606 OID 17392)
-- Name: favouritelistitems favouritelistitems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favouritelistitems
    ADD CONSTRAINT favouritelistitems_pkey PRIMARY KEY (list_item_id);


--
-- TOC entry 4777 (class 2606 OID 17379)
-- Name: favouritelists favouritelists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favouritelists
    ADD CONSTRAINT favouritelists_pkey PRIMARY KEY (list_id);


--
-- TOC entry 4763 (class 2606 OID 17087)
-- Name: member member_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_email_key UNIQUE (email);


--
-- TOC entry 4765 (class 2606 OID 17089)
-- Name: member member_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_pkey PRIMARY KEY (id);


--
-- TOC entry 4769 (class 2606 OID 17091)
-- Name: member_role member_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_role
    ADD CONSTRAINT member_role_pkey PRIMARY KEY (id);


--
-- TOC entry 4767 (class 2606 OID 17093)
-- Name: member member_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_username_key UNIQUE (username);


--
-- TOC entry 4771 (class 2606 OID 17095)
-- Name: product product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (id);


--
-- TOC entry 4783 (class 2606 OID 17451)
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (reviewid);


--
-- TOC entry 4785 (class 2606 OID 17453)
-- Name: reviews reviews_productid_memberid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_productid_memberid_key UNIQUE (productid, memberid);


--
-- TOC entry 4775 (class 2606 OID 17097)
-- Name: sale_order_item sale_order_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order_item
    ADD CONSTRAINT sale_order_item_pkey PRIMARY KEY (id);


--
-- TOC entry 4773 (class 2606 OID 17099)
-- Name: sale_order sale_order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order
    ADD CONSTRAINT sale_order_pkey PRIMARY KEY (id);


--
-- TOC entry 4791 (class 2606 OID 17395)
-- Name: favouritelistitems favouritelistitems_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favouritelistitems
    ADD CONSTRAINT favouritelistitems_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.favouritelists(list_id) ON DELETE CASCADE;


--
-- TOC entry 4792 (class 2606 OID 17400)
-- Name: favouritelistitems favouritelistitems_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favouritelistitems
    ADD CONSTRAINT favouritelistitems_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id) ON DELETE CASCADE;


--
-- TOC entry 4790 (class 2606 OID 17380)
-- Name: favouritelists favouritelists_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favouritelists
    ADD CONSTRAINT favouritelists_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.member(id) ON DELETE CASCADE;


--
-- TOC entry 4786 (class 2606 OID 17100)
-- Name: member fk_member_role_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT fk_member_role_id FOREIGN KEY (role) REFERENCES public.member_role(id);


--
-- TOC entry 4788 (class 2606 OID 17105)
-- Name: sale_order_item fk_sale_order_item_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order_item
    ADD CONSTRAINT fk_sale_order_item_product FOREIGN KEY (product_id) REFERENCES public.product(id);


--
-- TOC entry 4789 (class 2606 OID 17110)
-- Name: sale_order_item fk_sale_order_item_sale_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order_item
    ADD CONSTRAINT fk_sale_order_item_sale_order FOREIGN KEY (sale_order_id) REFERENCES public.sale_order(id);


--
-- TOC entry 4787 (class 2606 OID 17115)
-- Name: sale_order fk_sale_order_member; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order
    ADD CONSTRAINT fk_sale_order_member FOREIGN KEY (member_id) REFERENCES public.member(id);


--
-- TOC entry 4793 (class 2606 OID 17459)
-- Name: reviews reviews_memberid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_memberid_fkey FOREIGN KEY (memberid) REFERENCES public.member(id) ON DELETE CASCADE;


--
-- TOC entry 4794 (class 2606 OID 17454)
-- Name: reviews reviews_productid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_productid_fkey FOREIGN KEY (productid) REFERENCES public.product(id) ON DELETE CASCADE;


-- Completed on 2024-07-12 14:54:27

--
-- PostgreSQL database dump complete
--

