/**
 * Password encryption utilities for secure storage
 * Uses AES-256-GCM encryption with a shared key
 */

// The encryption key will be fetched from system_settings
let cachedKey: string | null = null;

export async function getEncryptionKey(): Promise<string> {
  if (cachedKey) return cachedKey;
  
  const { supabase } = await import('@/integrations/supabase/client');
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'password_encryption_key')
    .single();
  
  if (error || !data?.setting_value) {
    throw new Error('Encryption key not configured');
  }
  
  cachedKey = data.setting_value;
  return cachedKey;
}

export async function encryptPassword(plainPassword: string): Promise<string> {
  const key = await getEncryptionKey();
  
  // Generate a random IV (12 bytes for GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Import the key
  const keyBuffer = Uint8Array.from(atob(key), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Encrypt the password
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoder.encode(plainPassword)
  );
  
  // Combine IV + encrypted data and encode as base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

export function clearEncryptionKeyCache(): void {
  cachedKey = null;
}
