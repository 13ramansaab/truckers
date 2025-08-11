import { supabase } from './supabase';

export interface ReceiptUploadResult {
  receipt_path: string;
  receipt_url: string;
}

export const uploadReceiptImage = async (imageUri: string): Promise<ReceiptUploadResult> => {
  try {
    // Fetch the image as blob
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `receipt_${timestamp}.jpg`;
    const filePath = `receipts/${filename}`;
    
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

export const ensureReceiptsBucket = async (): Promise<void> => {
  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.warn('Could not list buckets:', listError);
      return;
    }
    
    const receiptsBucket = buckets?.find(bucket => bucket.name === 'receipts');
    
    if (!receiptsBucket) {
      // Create bucket if it doesn't exist
      const { error: createError } = await supabase.storage.createBucket('receipts', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        fileSizeLimit: 5242880 // 5MB
      });
      
      if (createError) {
        console.warn('Could not create receipts bucket:', createError);
      }
    }
  } catch (error) {
    console.warn('Error ensuring receipts bucket:', error);
  }
};