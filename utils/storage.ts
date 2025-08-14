import { supabase } from './supabase';

export interface ReceiptUploadResult {
  receipt_path: string;
  receipt_url: string;
}

export const uploadReceiptImage = async (imageUri: string): Promise<ReceiptUploadResult> => {
  try {
    // Get current user ID
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Fetch the image as blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `receipt_${timestamp}.jpg`;
    const filePath = `receipts/user_${user.id}/${filename}`;
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('receipts')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });
    
    if (error) {
      throw error;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('receipts')
      .getPublicUrl(filePath);
    
    return {
      receipt_path: filePath,
      receipt_url: urlData.publicUrl
    };
  } catch (error) {
    console.error('Error uploading receipt:', error);
    throw error;
  }
};
