-- Clean up duplicates in system_field_options table
-- Keep the best formatted version (prefer proper case over all caps/lowercase)

DO $$
DECLARE
    field_record RECORD;
    duplicate_group RECORD;
    keeper_id UUID;
    duplicate_ids UUID[];
BEGIN
    -- Process each field that has duplicates
    FOR field_record IN 
        SELECT DISTINCT field_name 
        FROM system_field_options 
        WHERE field_name IN (
            SELECT field_name 
            FROM system_field_options 
            GROUP BY field_name, LOWER(TRIM(option_value)) 
            HAVING COUNT(*) > 1
        )
    LOOP
        RAISE NOTICE 'Processing field: %', field_record.field_name;
        
        -- Find duplicate groups for this field
        FOR duplicate_group IN
            SELECT 
                LOWER(TRIM(option_value)) as normalized_value,
                array_agg(id ORDER BY 
                    -- Prefer mixed case over all caps
                    CASE WHEN option_value ~ '[a-z]' AND option_value ~ '[A-Z]' THEN 1 ELSE 2 END,
                    -- Prefer fewer special characters
                    length(regexp_replace(option_value, '[A-Za-z0-9 ]', '', 'g')),
                    -- Prefer shorter length (less likely to have extra spaces)
                    length(option_value),
                    -- Finally by alphabetical order
                    option_value
                ) as all_ids,
                array_agg(option_value ORDER BY 
                    CASE WHEN option_value ~ '[a-z]' AND option_value ~ '[A-Z]' THEN 1 ELSE 2 END,
                    length(regexp_replace(option_value, '[A-Za-z0-9 ]', '', 'g')),
                    length(option_value),
                    option_value
                ) as all_values
            FROM system_field_options 
            WHERE field_name = field_record.field_name
            GROUP BY LOWER(TRIM(option_value))
            HAVING COUNT(*) > 1
        LOOP
            -- Keep the first (best formatted) option
            keeper_id := duplicate_group.all_ids[1];
            duplicate_ids := duplicate_group.all_ids[2:array_length(duplicate_group.all_ids, 1)];
            
            RAISE NOTICE 'Keeping "%" (ID: %), removing % duplicates: %', 
                duplicate_group.all_values[1], 
                keeper_id, 
                array_length(duplicate_ids, 1),
                duplicate_group.all_values[2:array_length(duplicate_group.all_values, 1)];
            
            -- Delete the duplicates
            DELETE FROM system_field_options 
            WHERE id = ANY(duplicate_ids);
        END LOOP;
    END LOOP;
    
    -- Add a unique constraint to prevent future duplicates
    CREATE UNIQUE INDEX IF NOT EXISTS idx_system_field_options_case_insensitive_unique 
    ON system_field_options (field_name, LOWER(TRIM(option_value)));
    
    RAISE NOTICE 'Duplicate cleanup complete';
END $$;