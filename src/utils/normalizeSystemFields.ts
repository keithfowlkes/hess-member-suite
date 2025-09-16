import { supabase } from "@/integrations/supabase/client";

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
    "CAMS": "Unit4 CAMS",
    
    // Other standardizations
    "In-house Developed": "In-House Developed",
    "In-house developed": "In-House Developed",
    "Blackbaud Education Edge": "Blackbaud Education Edge",
    "Comspec Empower": "Comspec Empower",
    "Populi": "Populi",
    "Campus Cafe": "Campus Cafe",
    "Collegix": "Collegix",
    "Aptron Collegix": "Collegix",
    "EDC Campus Anywhere": "Campus Anywhere",
    "SONIS": "Jenzabar ONE"
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
    
    // Unit4/CAMS variations  
    "Unit4 / CAMS": "Unit4 CAMS",
    "CAMS": "Unit4 CAMS",
    "Unit4": "Unit4 CAMS",
    
    // Other common systems
    "Workday": "Workday",
    "Oracle": "Oracle Cloud",
    "Jenzabar EX": "Jenzabar EX",
    "Populi": "Populi",
    "QuickBooks": "QuickBooks"
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
    
    // Unit4/CAMS variations
    "Unit4 / CAMS": "Unit4 CAMS", 
    "CAMS": "Unit4 CAMS",
    
    // Other systems
    "Jenzabar EX": "Jenzabar EX",
    "Workday": "Workday Student",
    "Populi": "Populi"
  },
  
  admissions_crm: {
    // Slate variations
    "Slate": "Technolutions Slate",
    "Technolutions Slate": "Technolutions Slate",
    "SLATE from Technolutions": "Technolutions Slate",
    "Technolutions-Slate": "Technolutions Slate",
    "Slate for Admissions": "Technolutions Slate",
    
    // TargetX variations
    "TargetX": "TargetX",
    "Target X": "TargetX",
    "TargetX/Salesforce": "TargetX",
    
    // Ellucian variations
    "Ellucian CRM Recruit": "Ellucian CRM Recruit",
    "CRM Recruit": "Ellucian CRM Recruit",
    "Recruit": "Ellucian CRM Recruit",
    "Banner": "Ellucian Banner",
    "Ellucian Banner": "Ellucian Banner",
    "Colleague": "Ellucian Colleague",
    "Ellucian Colleague": "Ellucian Colleague",
    
    // Anthology variations
    "Anthology/Campus Management": "Anthology/Campus Management",
    "Campus Management": "Anthology/Campus Management",
    "Campus Management Connect": "Anthology/Campus Management",
    
    // Other systems
    "Salesforce": "Salesforce",
    "Jenzabar EX": "Jenzabar EX",
    "Populi": "Populi",
    "In-house Developed": "In-House Developed"
  },
  
  alumni_advancement_crm: {
    // Blackbaud variations
    "Blackbaud Raiser's Edge": "Blackbaud Raiser's Edge",
    "Raiser's Edge": "Blackbaud Raiser's Edge",
    "Blackbaud RaisersEdge": "Blackbaud Raiser's Edge",
    
    // Ellucian variations
    "Ellucian Banner Advancement": "Ellucian Banner Advancement", 
    "Banner Advancement": "Ellucian Banner Advancement",
    "Ellucian Colleague Advancement": "Ellucian Colleague Advancement",
    "Colleage Advancement": "Ellucian Colleague Advancement",
    
    // DonorPerfect variations
    "DonorPerfect": "DonorPerfect",
    
    // Other systems
    "iModules": "iModules",
    "Anthology/Campus Management": "Anthology/Campus Management",
    "Campus Management": "Anthology/Campus Management",
    "In-house Developed": "In-House Developed"
  }
};

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
      if (currentValue.toLowerCase().includes('one') || currentValue.toLowerCase().includes('sonis')) return 'Jenzabar ONE';
      return 'Jenzabar EX';
    }
    if (currentValue.toLowerCase().includes('powercampus')) return 'Ellucian PowerCampus';
    if (currentValue.toLowerCase().includes('campus management') || currentValue.toLowerCase().includes('anthology')) {
      return 'Anthology/Campus Management';
    }
    if (currentValue.toLowerCase().includes('cams') || currentValue.toLowerCase().includes('unit4')) {
      return 'Unit4 CAMS';
    }
    if (currentValue.toLowerCase().includes('workday')) return 'Workday Student';
  }
  
  if (fieldName === 'financial_system') {
    if (currentValue.toLowerCase().includes('banner')) return 'Ellucian Banner';
    if (currentValue.toLowerCase().includes('colleague')) return 'Ellucian Colleague';
    if (currentValue.toLowerCase().includes('dynamics') || currentValue.toLowerCase().includes('great plains')) return 'Microsoft Dynamics GP';
    if (currentValue.toLowerCase().includes('blackbaud') && currentValue.toLowerCase().includes('financial')) return 'Blackbaud Financial Edge';
    if (currentValue.toLowerCase().includes('cams') || currentValue.toLowerCase().includes('unit4')) return 'Unit4 CAMS';
  }
  
  if (fieldName === 'admissions_crm') {
    if (currentValue.toLowerCase().includes('slate') || currentValue.toLowerCase().includes('technolutions')) return 'Technolutions Slate';
    if (currentValue.toLowerCase().includes('targetx') || currentValue.toLowerCase().includes('target x')) return 'TargetX';
    if (currentValue.toLowerCase().includes('crm recruit') || currentValue.toLowerCase().includes('recruit')) return 'Ellucian CRM Recruit';
    if (currentValue.toLowerCase().includes('salesforce')) return 'Salesforce';
  }
  
  if (fieldName === 'alumni_advancement_crm') {
    if (currentValue.toLowerCase().includes("raiser's edge") || currentValue.toLowerCase().includes('raisersedge')) return "Blackbaud Raiser's Edge";
    if (currentValue.toLowerCase().includes('donorperfect')) return 'DonorPerfect';
    if (currentValue.toLowerCase().includes('banner') && currentValue.toLowerCase().includes('advancement')) return 'Ellucian Banner Advancement';
    if (currentValue.toLowerCase().includes('colleague') && currentValue.toLowerCase().includes('advancement')) return 'Ellucian Colleague Advancement';
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
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`id, name, ${fieldName}`)
        .not(fieldName, 'is', null);
        
      if (error) {
        console.error(`Error fetching ${fieldName}:`, error);
        continue;
      }
      
      if (data && Array.isArray(data)) {
        data.forEach((orgRecord) => {
          const org = orgRecord as Record<string, any>;
          if (org?.id && org?.name) {
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
          }
        });
      }
    } catch (error) {
      console.error(`Error processing preview for ${fieldName}:`, error);
    }
  }
  
  return preview;
}

// Execute normalization (simplified version without backup)
export async function executeNormalization(fieldNames: string[] = [], confirm: boolean = false): Promise<{
  success: boolean;
  processed: number;
  errors: string[];
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
      
      if (orgs && Array.isArray(orgs)) {
        for (const orgRecord of orgs) {
          const org = orgRecord as Record<string, any>;
          if (org?.id && org?.name) {
            const currentValue = org[fieldName];
            const normalizedValue = normalizeFieldValue(fieldName, currentValue);
            
            if (currentValue !== normalizedValue) {
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
