import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FieldMapping {
  [currentValue: string]: string;
}

interface SystemFieldMappings {
  [fieldName: string]: FieldMapping;
}

// Normalization mappings based on common variations
const FIELD_MAPPINGS: SystemFieldMappings = {
  student_information_system: {
    // Ellucian variations
    "Ellucian Colleague": "Ellucian Colleague",
    "Colleague": "Ellucian Colleague", 
    "Ellucian Banner": "Ellucian Banner",
    "Banner": "Ellucian Banner",
    "Ellucian PowerCampus": "Ellucian PowerCampus",
    "PowerCampus": "Ellucian PowerCampus",
    
    // Jenzabar variations
    "Jenzabar ONE": "Jenzabar ONE",
    "Jenzabar EX": "Jenzabar EX",
    "Jenzabar EX ": "Jenzabar EX",
    "Jenzabar CX/JX": "Jenzabar EX",
    "Jenzabar CX (legacy)": "Jenzabar EX",
    "Jenzabar SONIS": "Jenzabar ONE",
    
    // Anthology/Campus Management variations
    "Anthology/Campus Management": "Anthology/Campus Management",
    "Campus Management": "Anthology/Campus Management",
    
    // Oracle variations
    "Oracle Peoplesoft": "Oracle PeopleSoft",
    "Oracle Higher Ed / PeopleSoft": "Oracle PeopleSoft",
    "Oracle Cloud": "Oracle Cloud",
    
    // Workday
    "Workday": "Workday Student",
    
    // Unit4/CAMS variations
    "Unit4 / CAMS": "Unit4 CAMS",
    "CAMS/ Microsoft Dynamics": "Unit4 CAMS",
    "Unit4 Agresso EMS": "Unit4 CAMS",
    
    // Other standardizations
    "In-house Developed": "In-House Developed",
    "In-house developed": "In-House Developed",
    "Blackbaud Education Edge": "Blackbaud Education Edge",
    "Comspec Empower": "Comspec Empower",
    "Populi": "Populi",
    "Campus Cafe": "Campus Cafe",
    "Collegix": "Collegix",
    "Aptron Collegix": "Collegix",
    "EDC Campus Anywhere": "Campus Anywhere"
  },
  
  financial_system: {
    // Banner variations
    "Banner Finance": "Ellucian Banner",
    "Ellucian Banner Finance": "Ellucian Banner", 
    "Banner": "Ellucian Banner",
    
    // Colleague variations
    "Colleague": "Ellucian Colleague",
    "Ellucian Colleague": "Ellucian Colleague",
    
    // Anthology variations
    "Anthology/Campus Management": "Anthology/Campus Management",
    "Campus Management": "Anthology/Campus Management",
    
    // Blackbaud variations
    "Blackbaud Education Edge": "Blackbaud Education Edge",
    "Blackbaud Financial Edge": "Blackbaud Financial Edge",
    "Financial Edge": "Blackbaud Financial Edge",
    
    // Microsoft Dynamics variations
    "Microsoft Dynamics GP": "Microsoft Dynamics GP",
    "Great Plains": "Microsoft Dynamics GP",
    "Dynamics GP": "Microsoft Dynamics GP",
    
    // Other common systems
    "Workday": "Workday",
    "Oracle": "Oracle Cloud",
    "Jenzabar EX": "Jenzabar EX",
    "Unit4": "Unit4 CAMS",
    "Populi": "Populi"
  },
  
  financial_aid: {
    // PowerFAIDS variations
    "PowerFAIDS": "PowerFAIDS",
    "Ellucian PowerFAIDS": "PowerFAIDS",
    
    // Anthology variations
    "Anthology/Campus Management": "Anthology/Campus Management",
    "Campus Management": "Anthology/Campus Management",
    
    // Banner variations
    "Banner": "Ellucian Banner",
    "Ellucian Banner": "Ellucian Banner",
    
    // Colleague variations 
    "Colleague": "Ellucian Colleague",
    "Ellucian Colleague": "Ellucian Colleague",
    
    // Blackbaud variations
    "Blackbaud Financial Edge": "Blackbaud Financial Edge",
    "Financial Edge": "Blackbaud Financial Edge",
    
    // Other systems
    "Jenzabar EX": "Jenzabar EX",
    "Workday": "Workday Student",
    "Populi": "Populi"
  }
};

export interface NormalizationBackup {
  id: string;
  organizationId: string;
  fieldName: string;
  originalValue: string | null;
  normalizedValue: string | null;
  timestamp: string;
}

// Create backup table for original values
export async function createBackupTable(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS organization_field_backups (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          organization_id uuid NOT NULL,
          field_name text NOT NULL,
          original_value text,
          normalized_value text,
          created_at timestamp with time zone DEFAULT now(),
          created_by uuid DEFAULT auth.uid()
        );
        
        -- Enable RLS
        ALTER TABLE organization_field_backups ENABLE ROW LEVEL SECURITY;
        
        -- Create admin-only policy
        CREATE POLICY IF NOT EXISTS "Admins can manage field backups" 
        ON organization_field_backups 
        FOR ALL 
        USING (has_role(auth.uid(), 'admin'::app_role));
      `
    });
    
    if (error) {
      console.error('Error creating backup table:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error creating backup table:', error);
    return false;
  }
}

// Get current system field options for validation
export async function getSystemFieldOptions(): Promise<{[fieldName: string]: string[]}> {
  const { data, error } = await supabase
    .from('system_field_options')
    .select('field_name, option_value');
    
  if (error) {
    console.error('Error fetching system field options:', error);
    return {};
  }
  
  const options: {[fieldName: string]: string[]} = {};
  data.forEach(item => {
    if (!options[item.field_name]) {
      options[item.field_name] = [];
    }
    options[item.field_name].push(item.option_value);
  });
  
  return options;
}

// Normalize a single field value
export function normalizeFieldValue(fieldName: string, currentValue: string | null): string | null {
  if (!currentValue || currentValue.trim() === '') return null;
  
  const mappings = FIELD_MAPPINGS[fieldName];
  if (!mappings) return currentValue;
  
  // Check for exact match first
  if (mappings[currentValue]) {
    return mappings[currentValue];
  }
  
  // Check for case-insensitive match
  const lowerValue = currentValue.toLowerCase();
  for (const [key, value] of Object.entries(mappings)) {
    if (key.toLowerCase() === lowerValue) {
      return value;
    }
  }
  
  // Check for partial matches for common cases
  if (fieldName === 'student_information_system') {
    if (currentValue.toLowerCase().includes('colleague')) return 'Ellucian Colleague';
    if (currentValue.toLowerCase().includes('banner')) return 'Ellucian Banner';
    if (currentValue.toLowerCase().includes('jenzabar')) {
      if (currentValue.toLowerCase().includes('one')) return 'Jenzabar ONE';
      return 'Jenzabar EX';
    }
    if (currentValue.toLowerCase().includes('powercampus')) return 'Ellucian PowerCampus';
    if (currentValue.toLowerCase().includes('campus management') || currentValue.toLowerCase().includes('anthology')) {
      return 'Anthology/Campus Management';
    }
  }
  
  return currentValue; // Return original if no mapping found
}

// Preview normalization changes
export async function previewNormalization(fieldNames: string[] = []) {
  const fields = fieldNames.length ? fieldNames : Object.keys(FIELD_MAPPINGS);
  const preview: Array<{
    organizationId: string;
    fieldName: string;
    currentValue: string | null;
    proposedValue: string | null;
    organizationName: string;
  }> = [];
  
  for (const fieldName of fields) {
    const { data, error } = await supabase
      .from('organizations')
      .select(`id, name, ${fieldName}`)
      .not(fieldName, 'is', null);
      
    if (error) {
      console.error(`Error fetching ${fieldName}:`, error);
      continue;
    }
    
    data.forEach(org => {
      const currentValue = org[fieldName];
      const proposedValue = normalizeFieldValue(fieldName, currentValue);
      
      if (currentValue !== proposedValue) {
        preview.push({
          organizationId: org.id,
          fieldName,
          currentValue,
          proposedValue,
          organizationName: org.name
        });
      }
    });
  }
  
  return preview;
}

// Execute normalization with backup
export async function executeNormalization(fieldNames: string[] = [], confirm: boolean = false): Promise<{
  success: boolean;
  processed: number;
  errors: string[];
  backupId?: string;
}> {
  if (!confirm) {
    return {
      success: false,
      processed: 0,
      errors: ['Confirmation required for normalization']
    };
  }
  
  const fields = fieldNames.length ? fieldNames : Object.keys(FIELD_MAPPINGS);
  let processed = 0;
  const errors: string[] = [];
  
  // Create backup table if needed
  const backupCreated = await createBackupTable();
  if (!backupCreated) {
    return {
      success: false,
      processed: 0,
      errors: ['Failed to create backup table']
    };
  }
  
  // Get system field options for validation
  const systemOptions = await getSystemFieldOptions();
  
  for (const fieldName of fields) {
    try {
      const { data: orgs, error: fetchError } = await supabase
        .from('organizations')
        .select(`id, name, ${fieldName}`)
        .not(fieldName, 'is', null);
        
      if (fetchError) {
        errors.push(`Error fetching ${fieldName}: ${fetchError.message}`);
        continue;
      }
      
      for (const org of orgs || []) {
        const currentValue = org[fieldName];
        const normalizedValue = normalizeFieldValue(fieldName, currentValue);
        
        if (currentValue !== normalizedValue) {
          // Create backup first
          const { error: backupError } = await supabase
            .from('organization_field_backups')
            .insert({
              organization_id: org.id,
              field_name: fieldName,
              original_value: currentValue,
              normalized_value: normalizedValue
            });
            
          if (backupError) {
            errors.push(`Backup failed for org ${org.name}: ${backupError.message}`);
            continue;
          }
          
          // Validate against system options if available
          if (systemOptions[fieldName] && normalizedValue && !systemOptions[fieldName].includes(normalizedValue)) {
            console.warn(`Warning: ${normalizedValue} not in system options for ${fieldName}`);
          }
          
          // Update organization
          const { error: updateError } = await supabase
            .from('organizations')
            .update({ [fieldName]: normalizedValue })
            .eq('id', org.id);
            
          if (updateError) {
            errors.push(`Update failed for org ${org.name}: ${updateError.message}`);
            continue;
          }
          
          processed++;
        }
      }
    } catch (error) {
      errors.push(`Error processing ${fieldName}: ${error}`);
    }
  }
  
  return {
    success: errors.length === 0,
    processed,
    errors
  };
}

// Revert normalization using backup
export async function revertNormalization(backupTimestamp?: string): Promise<{
  success: boolean;
  reverted: number;
  errors: string[];
}> {
  let query = supabase
    .from('organization_field_backups')
    .select('*');
    
  if (backupTimestamp) {
    query = query.gte('created_at', backupTimestamp);
  }
  
  const { data: backups, error: fetchError } = await query;
  
  if (fetchError) {
    return {
      success: false,
      reverted: 0,
      errors: [`Error fetching backups: ${fetchError.message}`]
    };
  }
  
  let reverted = 0;
  const errors: string[] = [];
  
  for (const backup of backups || []) {
    try {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ [backup.field_name]: backup.original_value })
        .eq('id', backup.organization_id);
        
      if (updateError) {
        errors.push(`Revert failed for ${backup.organization_id}: ${updateError.message}`);
        continue;
      }
      
      reverted++;
    } catch (error) {
      errors.push(`Error reverting ${backup.organization_id}: ${error}`);
    }
  }
  
  return {
    success: errors.length === 0,
    reverted,
    errors
  };
}
