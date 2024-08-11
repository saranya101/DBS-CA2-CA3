DO $$
DECLARE
    results INTEGER[];
    item_count_before INTEGER;
    item_count_after INTEGER;
BEGIN
    results := ARRAY[1::INTEGER];

    -- Step 1: Count the number of items in sale_order_id = 1
    SELECT COUNT(*) INTO item_count_before FROM sale_order_item WHERE sale_order_id = 1;

    -- Append the initial count to the results array
    results := array_append(results, item_count_before);

    -- Introduce a delay to simulate processing time
    PERFORM pg_sleep(7);

    -- Step 2: Re-count the number of items in sale_order_id = 1 after the delay
    SELECT COUNT(*) INTO item_count_after FROM sale_order_item WHERE sale_order_id = 1;

    -- Append the final count to the results array
    results := array_append(results, item_count_after);

    -- Display the result
    RAISE NOTICE 'Results: %', results;
END $$;
