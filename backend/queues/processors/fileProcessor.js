import { saveToStorage } from '../../services/storageService.js';
import { saveFileMetadata } from '../../services/fileMetadataService.js';

export const processFileGeneration = async (job) => {
  const { files, userId } = job.data;
  console.log('Processing files:', { filesCount: files.length, userId });

  const results = [];
  
  for (const file of files) {
    try {
      const uploadData = await saveToStorage(userId, file);
      const fileData = await saveFileMetadata(userId, file, uploadData);
      
      results.push({
        path: file.path,
        url: `/uploads/${file.path}`,
        version: fileData.version
      });
    } catch (error) {
      console.error(`Error processing file ${file.path}:`, error);
      throw error;
    }
  }

  return results;
};