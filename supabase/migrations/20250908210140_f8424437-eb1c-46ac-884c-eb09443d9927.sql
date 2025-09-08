-- First, populate system_field_options table with existing unique values from profiles
-- This ensures we don't lose any existing data when replacing the system

DO $$
DECLARE
    field_record RECORD;
    unique_values TEXT[];
    value_text TEXT;
BEGIN
    -- Array of system fields to process
    FOR field_record IN 
        SELECT unnest(ARRAY[
            'student_information_system',
            'financial_system', 
            'financial_aid',
            'hcm_hr',
            'payroll_system',
            'purchasing_system',
            'housing_management',
            'learning_management',
            'admissions_crm',
            'alumni_advancement_crm'
        ]) AS field_name
    LOOP
        -- Get unique non-null, non-empty values for this field from profiles
        EXECUTE format('
            SELECT ARRAY(
                SELECT DISTINCT TRIM(%I) 
                FROM profiles 
                WHERE %I IS NOT NULL 
                AND TRIM(%I) != ''''
                ORDER BY TRIM(%I)
            )', 
            field_record.field_name, 
            field_record.field_name, 
            field_record.field_name,
            field_record.field_name
        ) INTO unique_values;
        
        -- Insert each unique value if it doesn't already exist
        FOREACH value_text IN ARRAY unique_values
        LOOP
            INSERT INTO system_field_options (field_name, option_value)
            VALUES (field_record.field_name, value_text)
            ON CONFLICT (field_name, option_value) DO NOTHING;
        END LOOP;
        
        RAISE NOTICE 'Processed field % with % unique values', field_record.field_name, array_length(unique_values, 1);
    END LOOP;
    
    -- Also process organizations table values
    FOR field_record IN 
        SELECT unnest(ARRAY[
            'student_information_system',
            'financial_system',
            'financial_aid', 
            'hcm_hr',
            'payroll_system',
            'purchasing_system',
            'housing_management',
            'learning_management',
            'admissions_crm',
            'alumni_advancement_crm'
        ]) AS field_name
    LOOP
        -- Get unique non-null, non-empty values for this field from organizations
        EXECUTE format('
            SELECT ARRAY(
                SELECT DISTINCT TRIM(%I) 
                FROM organizations 
                WHERE %I IS NOT NULL 
                AND TRIM(%I) != ''''
                ORDER BY TRIM(%I)
            )', 
            field_record.field_name, 
            field_record.field_name, 
            field_record.field_name,
            field_record.field_name
        ) INTO unique_values;
        
        -- Insert each unique value if it doesn't already exist
        FOREACH value_text IN ARRAY unique_values
        LOOP
            INSERT INTO system_field_options (field_name, option_value)
            VALUES (field_record.field_name, value_text)
            ON CONFLICT (field_name, option_value) DO NOTHING;
        END LOOP;
        
        RAISE NOTICE 'Processed organizations field % with % unique values', field_record.field_name, array_length(unique_values, 1);
    END LOOP;
END $$;

-- Add a unique constraint to prevent duplicate options per field
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_field_options_unique 
ON system_field_options (field_name, option_value);

-- Enable real-time updates for the system_field_options table
ALTER TABLE system_field_options REPLICA IDENTITY FULL;
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;