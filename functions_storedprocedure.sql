--
-- PostgreSQL database dump
--

-- Dumped from database version 16.3
-- Dumped by pg_dump version 16.3

-- Started on 2024-08-12 05:01:51

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
-- TOC entry 253 (class 1255 OID 31288)
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
-- TOC entry 266 (class 1255 OID 31289)
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
-- TOC entry 267 (class 1255 OID 31290)
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
-- TOC entry 268 (class 1255 OID 31291)
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
-- TOC entry 269 (class 1255 OID 31292)
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
-- TOC entry 270 (class 1255 OID 31293)
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
-- TOC entry 271 (class 1255 OID 31294)
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
-- TOC entry 252 (class 1255 OID 31295)
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
-- TOC entry 254 (class 1255 OID 31296)
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
-- TOC entry 272 (class 1255 OID 31297)
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
-- TOC entry 273 (class 1255 OID 31298)
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
-- TOC entry 274 (class 1255 OID 31299)
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
-- TOC entry 275 (class 1255 OID 31300)
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
-- TOC entry 279 (class 1255 OID 33158)
-- Name: place_orders(integer); Type: PROCEDURE; Schema: public; Owner: -
--

CREATE PROCEDURE public.place_orders(IN member_id integer, OUT out_of_stock_items text[])
    LANGUAGE plpgsql
    AS $$
DECLARE
    item RECORD;
    insufficient_item_list TEXT[] := '{}';
    sale_order_id INT;
    has_error BOOLEAN := FALSE;
BEGIN
    -- Start a transaction block
    BEGIN
        -- Create a new sale order
        INSERT INTO "sale_order" (member_id, order_datetime, status)
        VALUES (place_orders.member_id, NOW(), 'PACKING')
        RETURNING id INTO sale_order_id;

        FOR item IN
            SELECT
                ci.id AS cart_item_id,
                ci.product_id,
                ci.quantity,
                p.name,
                p.stock_quantity
            FROM
                "cart_item" ci
            JOIN
                product p ON ci.product_id = p.id
            WHERE
                ci.member_id = place_orders.member_id
        LOOP
            IF item.stock_quantity >= item.quantity THEN
                -- Deduct the stock quantity
                UPDATE product
                SET stock_quantity = stock_quantity - item.quantity
                WHERE id = item.product_id;

                -- Create the sale order item
                INSERT INTO "sale_order_item" (sale_order_id, product_id, quantity)
                VALUES (sale_order_id, item.product_id, item.quantity);

                -- Remove the item from the cart
                DELETE FROM "cart_item"
                WHERE id = item.cart_item_id;
            ELSE
                -- Add the item name to the insufficient items list
                insufficient_item_list := array_append(insufficient_item_list, item.name);
            END IF;
        END LOOP;

        -- Assign the out parameter
        out_of_stock_items := insufficient_item_list;

    EXCEPTION
        WHEN OTHERS THEN
            -- Rollback the transaction in case of any errors
            has_error := TRUE;
    END;

    -- If there was an error, raise an exception to trigger a rollback
    IF has_error THEN
        ROLLBACK;
        RAISE EXCEPTION 'An error occurred during the transaction.';
    ELSE
        -- Commit the transaction if no errors
        COMMIT;
    END IF;
END;
$$;


--
-- TOC entry 276 (class 1255 OID 31301)
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
-- TOC entry 277 (class 1255 OID 31302)
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
-- TOC entry 278 (class 1255 OID 31303)
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
-- TOC entry 241 (class 1259 OID 33112)
-- Name: Coupon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Coupon" (
    id integer NOT NULL,
    code text NOT NULL,
    description text,
    "discountPercentage" numeric(5,2) NOT NULL,
    "minPurchaseAmount" numeric(10,2),
    "validFrom" date NOT NULL,
    "validTo" date NOT NULL,
    "usageLimit" integer DEFAULT 1 NOT NULL,
    "timesUsed" integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 240 (class 1259 OID 33111)
-- Name: Coupon_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Coupon_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5059 (class 0 OID 0)
-- Dependencies: 240
-- Name: Coupon_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Coupon_id_seq" OWNED BY public."Coupon".id;


--
-- TOC entry 251 (class 1259 OID 36831)
-- Name: PointsBalance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."PointsBalance" (
    id integer NOT NULL,
    member_id integer NOT NULL,
    points integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 250 (class 1259 OID 36830)
-- Name: PointsBalance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."PointsBalance_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5060 (class 0 OID 0)
-- Dependencies: 250
-- Name: PointsBalance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."PointsBalance_id_seq" OWNED BY public."PointsBalance".id;


--
-- TOC entry 237 (class 1259 OID 33093)
-- Name: ProductDiscount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ProductDiscount" (
    id integer NOT NULL,
    "productId" integer NOT NULL,
    code text NOT NULL,
    description text,
    "discountPercentage" numeric(5,2) NOT NULL,
    "validFrom" date NOT NULL,
    "validTo" date NOT NULL,
    "usageLimit" integer DEFAULT 1 NOT NULL,
    "timesUsed" integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 236 (class 1259 OID 33092)
-- Name: ProductDiscount_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."ProductDiscount_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5061 (class 0 OID 0)
-- Dependencies: 236
-- Name: ProductDiscount_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."ProductDiscount_id_seq" OWNED BY public."ProductDiscount".id;


--
-- TOC entry 249 (class 1259 OID 36821)
-- Name: Referral; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Referral" (
    id integer NOT NULL,
    referrer_id integer NOT NULL,
    referred_id integer NOT NULL,
    referral_code text NOT NULL,
    points_awarded integer NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 248 (class 1259 OID 36820)
-- Name: Referral_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Referral_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5062 (class 0 OID 0)
-- Dependencies: 248
-- Name: Referral_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Referral_id_seq" OWNED BY public."Referral".id;


--
-- TOC entry 247 (class 1259 OID 35842)
-- Name: SocialMediaEngagement; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SocialMediaEngagement" (
    id integer NOT NULL,
    member_id integer NOT NULL,
    action text NOT NULL,
    platform text NOT NULL,
    points integer NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 246 (class 1259 OID 35841)
-- Name: SocialMediaEngagement_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."SocialMediaEngagement_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5063 (class 0 OID 0)
-- Dependencies: 246
-- Name: SocialMediaEngagement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."SocialMediaEngagement_id_seq" OWNED BY public."SocialMediaEngagement".id;


--
-- TOC entry 243 (class 1259 OID 33123)
-- Name: UsedCoupon; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UsedCoupon" (
    id integer NOT NULL,
    "couponId" integer NOT NULL,
    "memberId" integer NOT NULL,
    "usedOn" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 242 (class 1259 OID 33122)
-- Name: UsedCoupon_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."UsedCoupon_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5064 (class 0 OID 0)
-- Dependencies: 242
-- Name: UsedCoupon_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."UsedCoupon_id_seq" OWNED BY public."UsedCoupon".id;


--
-- TOC entry 239 (class 1259 OID 33104)
-- Name: UsedProductDiscount; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UsedProductDiscount" (
    id integer NOT NULL,
    "discountId" integer NOT NULL,
    "memberId" integer NOT NULL,
    "usedOn" timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- TOC entry 238 (class 1259 OID 33103)
-- Name: UsedProductDiscount_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."UsedProductDiscount_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5065 (class 0 OID 0)
-- Dependencies: 238
-- Name: UsedProductDiscount_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."UsedProductDiscount_id_seq" OWNED BY public."UsedProductDiscount".id;


--
-- TOC entry 233 (class 1259 OID 31440)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- TOC entry 235 (class 1259 OID 32482)
-- Name: cart_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cart_item (
    id integer NOT NULL,
    member_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity integer NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) without time zone NOT NULL
);


--
-- TOC entry 234 (class 1259 OID 32481)
-- Name: cart_item_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cart_item_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5066 (class 0 OID 0)
-- Dependencies: 234
-- Name: cart_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cart_item_id_seq OWNED BY public.cart_item.id;


--
-- TOC entry 215 (class 1259 OID 31304)
-- Name: favouritelistitems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favouritelistitems (
    list_item_id integer NOT NULL,
    list_id integer NOT NULL,
    product_id integer NOT NULL,
    added_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- TOC entry 216 (class 1259 OID 31308)
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
-- TOC entry 5067 (class 0 OID 0)
-- Dependencies: 216
-- Name: favouritelistitems_list_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.favouritelistitems_list_item_id_seq OWNED BY public.favouritelistitems.list_item_id;


--
-- TOC entry 217 (class 1259 OID 31309)
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
-- TOC entry 218 (class 1259 OID 31314)
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
-- TOC entry 5068 (class 0 OID 0)
-- Dependencies: 218
-- Name: favouritelists_list_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.favouritelists_list_id_seq OWNED BY public.favouritelists.list_id;


--
-- TOC entry 219 (class 1259 OID 31315)
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
    running_total_spending numeric(10,3),
    referral_code character varying(50)
);


--
-- TOC entry 220 (class 1259 OID 31319)
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
-- TOC entry 5069 (class 0 OID 0)
-- Dependencies: 220
-- Name: member_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.member_id_seq OWNED BY public.member.id;


--
-- TOC entry 221 (class 1259 OID 31320)
-- Name: member_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.member_role (
    id integer NOT NULL,
    name character varying(25)
);


--
-- TOC entry 222 (class 1259 OID 31323)
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
-- TOC entry 5070 (class 0 OID 0)
-- Dependencies: 222
-- Name: member_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.member_role_id_seq OWNED BY public.member_role.id;


--
-- TOC entry 223 (class 1259 OID 31324)
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
-- TOC entry 224 (class 1259 OID 31331)
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
-- TOC entry 5071 (class 0 OID 0)
-- Dependencies: 224
-- Name: product_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.product_id_seq OWNED BY public.product.id;


--
-- TOC entry 225 (class 1259 OID 31332)
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
-- TOC entry 226 (class 1259 OID 31340)
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
-- TOC entry 5072 (class 0 OID 0)
-- Dependencies: 226
-- Name: reviews_reviewid_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_reviewid_seq OWNED BY public.reviews.reviewid;


--
-- TOC entry 227 (class 1259 OID 31341)
-- Name: sale_order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_order (
    id integer NOT NULL,
    member_id integer,
    order_datetime timestamp without time zone NOT NULL,
    status character varying(10),
    shipping_method_id integer
);


--
-- TOC entry 228 (class 1259 OID 31344)
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
-- TOC entry 5073 (class 0 OID 0)
-- Dependencies: 228
-- Name: sale_order_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sale_order_id_seq OWNED BY public.sale_order.id;


--
-- TOC entry 229 (class 1259 OID 31345)
-- Name: sale_order_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sale_order_item (
    id integer NOT NULL,
    sale_order_id integer NOT NULL,
    product_id integer NOT NULL,
    quantity numeric NOT NULL
);


--
-- TOC entry 230 (class 1259 OID 31350)
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
-- TOC entry 5074 (class 0 OID 0)
-- Dependencies: 230
-- Name: sale_order_item_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sale_order_item_id_seq OWNED BY public.sale_order_item.id;


--
-- TOC entry 245 (class 1259 OID 34012)
-- Name: shipping_method; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shipping_method (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    cost numeric(10,2) NOT NULL,
    "deliveryTime" character varying(50) NOT NULL
);


--
-- TOC entry 244 (class 1259 OID 34011)
-- Name: shipping_method_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.shipping_method_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5075 (class 0 OID 0)
-- Dependencies: 244
-- Name: shipping_method_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.shipping_method_id_seq OWNED BY public.shipping_method.id;


--
-- TOC entry 231 (class 1259 OID 31351)
-- Name: supplier; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier (
    id integer NOT NULL,
    company_name character varying(255) NOT NULL,
    descriptor text,
    address character varying(255),
    country character varying(100) NOT NULL,
    contact_email character varying(50) NOT NULL,
    company_url character varying(255),
    founded_date date,
    staff_size integer,
    specialization character varying(100),
    is_active boolean
);


--
-- TOC entry 232 (class 1259 OID 31356)
-- Name: supplier_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.supplier_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- TOC entry 5076 (class 0 OID 0)
-- Dependencies: 232
-- Name: supplier_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supplier_id_seq OWNED BY public.supplier.id;


--
-- TOC entry 4820 (class 2604 OID 33115)
-- Name: Coupon id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Coupon" ALTER COLUMN id SET DEFAULT nextval('public."Coupon_id_seq"'::regclass);


--
-- TOC entry 4830 (class 2604 OID 36834)
-- Name: PointsBalance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PointsBalance" ALTER COLUMN id SET DEFAULT nextval('public."PointsBalance_id_seq"'::regclass);


--
-- TOC entry 4815 (class 2604 OID 33096)
-- Name: ProductDiscount id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductDiscount" ALTER COLUMN id SET DEFAULT nextval('public."ProductDiscount_id_seq"'::regclass);


--
-- TOC entry 4828 (class 2604 OID 36824)
-- Name: Referral id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Referral" ALTER COLUMN id SET DEFAULT nextval('public."Referral_id_seq"'::regclass);


--
-- TOC entry 4826 (class 2604 OID 35845)
-- Name: SocialMediaEngagement id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SocialMediaEngagement" ALTER COLUMN id SET DEFAULT nextval('public."SocialMediaEngagement_id_seq"'::regclass);


--
-- TOC entry 4823 (class 2604 OID 33126)
-- Name: UsedCoupon id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UsedCoupon" ALTER COLUMN id SET DEFAULT nextval('public."UsedCoupon_id_seq"'::regclass);


--
-- TOC entry 4818 (class 2604 OID 33107)
-- Name: UsedProductDiscount id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UsedProductDiscount" ALTER COLUMN id SET DEFAULT nextval('public."UsedProductDiscount_id_seq"'::regclass);


--
-- TOC entry 4813 (class 2604 OID 32485)
-- Name: cart_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_item ALTER COLUMN id SET DEFAULT nextval('public.cart_item_id_seq'::regclass);


--
-- TOC entry 4794 (class 2604 OID 31357)
-- Name: favouritelistitems list_item_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favouritelistitems ALTER COLUMN list_item_id SET DEFAULT nextval('public.favouritelistitems_list_item_id_seq'::regclass);


--
-- TOC entry 4796 (class 2604 OID 31358)
-- Name: favouritelists list_id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favouritelists ALTER COLUMN list_id SET DEFAULT nextval('public.favouritelists_list_id_seq'::regclass);


--
-- TOC entry 4799 (class 2604 OID 31359)
-- Name: member id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member ALTER COLUMN id SET DEFAULT nextval('public.member_id_seq'::regclass);


--
-- TOC entry 4801 (class 2604 OID 31360)
-- Name: member_role id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_role ALTER COLUMN id SET DEFAULT nextval('public.member_role_id_seq'::regclass);


--
-- TOC entry 4802 (class 2604 OID 31361)
-- Name: product id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product ALTER COLUMN id SET DEFAULT nextval('public.product_id_seq'::regclass);


--
-- TOC entry 4805 (class 2604 OID 31362)
-- Name: reviews reviewid; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews ALTER COLUMN reviewid SET DEFAULT nextval('public.reviews_reviewid_seq'::regclass);


--
-- TOC entry 4808 (class 2604 OID 31363)
-- Name: sale_order id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order ALTER COLUMN id SET DEFAULT nextval('public.sale_order_id_seq'::regclass);


--
-- TOC entry 4809 (class 2604 OID 31364)
-- Name: sale_order_item id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order_item ALTER COLUMN id SET DEFAULT nextval('public.sale_order_item_id_seq'::regclass);


--
-- TOC entry 4825 (class 2604 OID 34015)
-- Name: shipping_method id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_method ALTER COLUMN id SET DEFAULT nextval('public.shipping_method_id_seq'::regclass);


--
-- TOC entry 4810 (class 2604 OID 31365)
-- Name: supplier id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier ALTER COLUMN id SET DEFAULT nextval('public.supplier_id_seq'::regclass);


--
-- TOC entry 4876 (class 2606 OID 33121)
-- Name: Coupon Coupon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Coupon"
    ADD CONSTRAINT "Coupon_pkey" PRIMARY KEY (id);


--
-- TOC entry 4889 (class 2606 OID 36837)
-- Name: PointsBalance PointsBalance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PointsBalance"
    ADD CONSTRAINT "PointsBalance_pkey" PRIMARY KEY (id);


--
-- TOC entry 4871 (class 2606 OID 33102)
-- Name: ProductDiscount ProductDiscount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductDiscount"
    ADD CONSTRAINT "ProductDiscount_pkey" PRIMARY KEY (id);


--
-- TOC entry 4885 (class 2606 OID 36829)
-- Name: Referral Referral_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Referral"
    ADD CONSTRAINT "Referral_pkey" PRIMARY KEY (id);


--
-- TOC entry 4883 (class 2606 OID 35850)
-- Name: SocialMediaEngagement SocialMediaEngagement_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SocialMediaEngagement"
    ADD CONSTRAINT "SocialMediaEngagement_pkey" PRIMARY KEY (id);


--
-- TOC entry 4878 (class 2606 OID 33129)
-- Name: UsedCoupon UsedCoupon_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UsedCoupon"
    ADD CONSTRAINT "UsedCoupon_pkey" PRIMARY KEY (id);


--
-- TOC entry 4873 (class 2606 OID 33110)
-- Name: UsedProductDiscount UsedProductDiscount_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UsedProductDiscount"
    ADD CONSTRAINT "UsedProductDiscount_pkey" PRIMARY KEY (id);


--
-- TOC entry 4865 (class 2606 OID 31448)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 4868 (class 2606 OID 32488)
-- Name: cart_item cart_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_item
    ADD CONSTRAINT cart_item_pkey PRIMARY KEY (id);


--
-- TOC entry 4834 (class 2606 OID 31367)
-- Name: favouritelistitems favouritelistitems_list_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favouritelistitems
    ADD CONSTRAINT favouritelistitems_list_id_product_id_key UNIQUE (list_id, product_id);


--
-- TOC entry 4836 (class 2606 OID 31369)
-- Name: favouritelistitems favouritelistitems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favouritelistitems
    ADD CONSTRAINT favouritelistitems_pkey PRIMARY KEY (list_item_id);


--
-- TOC entry 4838 (class 2606 OID 31371)
-- Name: favouritelists favouritelists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favouritelists
    ADD CONSTRAINT favouritelists_pkey PRIMARY KEY (list_id);


--
-- TOC entry 4840 (class 2606 OID 31373)
-- Name: member member_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_email_key UNIQUE (email);


--
-- TOC entry 4842 (class 2606 OID 31375)
-- Name: member member_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_pkey PRIMARY KEY (id);


--
-- TOC entry 4847 (class 2606 OID 31377)
-- Name: member_role member_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member_role
    ADD CONSTRAINT member_role_pkey PRIMARY KEY (id);


--
-- TOC entry 4845 (class 2606 OID 31379)
-- Name: member member_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT member_username_key UNIQUE (username);


--
-- TOC entry 4849 (class 2606 OID 31381)
-- Name: product product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product
    ADD CONSTRAINT product_pkey PRIMARY KEY (id);


--
-- TOC entry 4851 (class 2606 OID 31383)
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (reviewid);


--
-- TOC entry 4853 (class 2606 OID 31385)
-- Name: reviews reviews_productid_memberid_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_productid_memberid_key UNIQUE (productid, memberid);


--
-- TOC entry 4857 (class 2606 OID 31387)
-- Name: sale_order_item sale_order_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order_item
    ADD CONSTRAINT sale_order_item_pkey PRIMARY KEY (id);


--
-- TOC entry 4855 (class 2606 OID 31389)
-- Name: sale_order sale_order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order
    ADD CONSTRAINT sale_order_pkey PRIMARY KEY (id);


--
-- TOC entry 4881 (class 2606 OID 34017)
-- Name: shipping_method shipping_method_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shipping_method
    ADD CONSTRAINT shipping_method_pkey PRIMARY KEY (id);


--
-- TOC entry 4863 (class 2606 OID 31391)
-- Name: supplier supplier_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier
    ADD CONSTRAINT supplier_pkey PRIMARY KEY (id);


--
-- TOC entry 4874 (class 1259 OID 33131)
-- Name: Coupon_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Coupon_code_key" ON public."Coupon" USING btree (code);


--
-- TOC entry 4887 (class 1259 OID 36839)
-- Name: PointsBalance_member_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "PointsBalance_member_id_key" ON public."PointsBalance" USING btree (member_id);


--
-- TOC entry 4869 (class 1259 OID 33130)
-- Name: ProductDiscount_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ProductDiscount_code_key" ON public."ProductDiscount" USING btree (code);


--
-- TOC entry 4886 (class 1259 OID 36838)
-- Name: Referral_referral_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Referral_referral_code_key" ON public."Referral" USING btree (referral_code);


--
-- TOC entry 4866 (class 1259 OID 32489)
-- Name: cart_item_member_id_product_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX cart_item_member_id_product_id_key ON public.cart_item USING btree (member_id, product_id);


--
-- TOC entry 4858 (class 1259 OID 41013)
-- Name: idx_active_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_active_country ON public.supplier USING btree (is_active, country);


--
-- TOC entry 4859 (class 1259 OID 41014)
-- Name: idx_specialization; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_specialization ON public.supplier USING btree (specialization);


--
-- TOC entry 4860 (class 1259 OID 41015)
-- Name: idx_staff_size_partial; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_size_partial ON public.supplier USING btree (staff_size) WHERE (staff_size > 1000);


--
-- TOC entry 4861 (class 1259 OID 41012)
-- Name: idx_supplier_country; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_country ON public.supplier USING btree (country);


--
-- TOC entry 4843 (class 1259 OID 36840)
-- Name: member_referral_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX member_referral_code_key ON public.member USING btree (referral_code);


--
-- TOC entry 4879 (class 1259 OID 34018)
-- Name: shipping_method_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX shipping_method_name_key ON public.shipping_method USING btree (name);


--
-- TOC entry 4910 (class 2606 OID 36851)
-- Name: PointsBalance PointsBalance_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."PointsBalance"
    ADD CONSTRAINT "PointsBalance_member_id_fkey" FOREIGN KEY (member_id) REFERENCES public.member(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4902 (class 2606 OID 33132)
-- Name: ProductDiscount ProductDiscount_productId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ProductDiscount"
    ADD CONSTRAINT "ProductDiscount_productId_fkey" FOREIGN KEY ("productId") REFERENCES public.product(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4908 (class 2606 OID 36846)
-- Name: Referral Referral_referred_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Referral"
    ADD CONSTRAINT "Referral_referred_id_fkey" FOREIGN KEY (referred_id) REFERENCES public.member(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4909 (class 2606 OID 36841)
-- Name: Referral Referral_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Referral"
    ADD CONSTRAINT "Referral_referrer_id_fkey" FOREIGN KEY (referrer_id) REFERENCES public.member(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4907 (class 2606 OID 35851)
-- Name: SocialMediaEngagement SocialMediaEngagement_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SocialMediaEngagement"
    ADD CONSTRAINT "SocialMediaEngagement_member_id_fkey" FOREIGN KEY (member_id) REFERENCES public.member(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- TOC entry 4905 (class 2606 OID 33147)
-- Name: UsedCoupon UsedCoupon_couponId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UsedCoupon"
    ADD CONSTRAINT "UsedCoupon_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES public."Coupon"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4906 (class 2606 OID 33152)
-- Name: UsedCoupon UsedCoupon_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UsedCoupon"
    ADD CONSTRAINT "UsedCoupon_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public.member(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4903 (class 2606 OID 33137)
-- Name: UsedProductDiscount UsedProductDiscount_discountId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UsedProductDiscount"
    ADD CONSTRAINT "UsedProductDiscount_discountId_fkey" FOREIGN KEY ("discountId") REFERENCES public."ProductDiscount"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4904 (class 2606 OID 33142)
-- Name: UsedProductDiscount UsedProductDiscount_memberId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UsedProductDiscount"
    ADD CONSTRAINT "UsedProductDiscount_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES public.member(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- TOC entry 4900 (class 2606 OID 32490)
-- Name: cart_item cart_item_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_item
    ADD CONSTRAINT cart_item_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.member(id) ON DELETE CASCADE;


--
-- TOC entry 4901 (class 2606 OID 32495)
-- Name: cart_item cart_item_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_item
    ADD CONSTRAINT cart_item_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id) ON DELETE CASCADE;


--
-- TOC entry 4890 (class 2606 OID 31392)
-- Name: favouritelistitems favouritelistitems_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favouritelistitems
    ADD CONSTRAINT favouritelistitems_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.favouritelists(list_id) ON DELETE CASCADE;


--
-- TOC entry 4891 (class 2606 OID 31397)
-- Name: favouritelistitems favouritelistitems_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favouritelistitems
    ADD CONSTRAINT favouritelistitems_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.product(id) ON DELETE CASCADE;


--
-- TOC entry 4892 (class 2606 OID 31402)
-- Name: favouritelists favouritelists_member_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favouritelists
    ADD CONSTRAINT favouritelists_member_id_fkey FOREIGN KEY (member_id) REFERENCES public.member(id) ON DELETE CASCADE;


--
-- TOC entry 4893 (class 2606 OID 31407)
-- Name: member fk_member_role_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.member
    ADD CONSTRAINT fk_member_role_id FOREIGN KEY (role) REFERENCES public.member_role(id);


--
-- TOC entry 4898 (class 2606 OID 31412)
-- Name: sale_order_item fk_sale_order_item_product; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order_item
    ADD CONSTRAINT fk_sale_order_item_product FOREIGN KEY (product_id) REFERENCES public.product(id);


--
-- TOC entry 4899 (class 2606 OID 31417)
-- Name: sale_order_item fk_sale_order_item_sale_order; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order_item
    ADD CONSTRAINT fk_sale_order_item_sale_order FOREIGN KEY (sale_order_id) REFERENCES public.sale_order(id);


--
-- TOC entry 4896 (class 2606 OID 31422)
-- Name: sale_order fk_sale_order_member; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order
    ADD CONSTRAINT fk_sale_order_member FOREIGN KEY (member_id) REFERENCES public.member(id);


--
-- TOC entry 4894 (class 2606 OID 31427)
-- Name: reviews reviews_memberid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_memberid_fkey FOREIGN KEY (memberid) REFERENCES public.member(id) ON DELETE CASCADE;


--
-- TOC entry 4895 (class 2606 OID 31432)
-- Name: reviews reviews_productid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_productid_fkey FOREIGN KEY (productid) REFERENCES public.product(id) ON DELETE CASCADE;


--
-- TOC entry 4897 (class 2606 OID 34019)
-- Name: sale_order sale_order_shipping_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sale_order
    ADD CONSTRAINT sale_order_shipping_method_id_fkey FOREIGN KEY (shipping_method_id) REFERENCES public.shipping_method(id) ON UPDATE CASCADE ON DELETE SET NULL;


-- Completed on 2024-08-12 05:01:51

--
-- PostgreSQL database dump complete
--

