export const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) return;
  
  // Get headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  
  // Add rows
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] || '';
      // Escape quotes and wrap in quotes if needed
      const escaped = ('' + value).replace(/"/g, '\\"');
      return `"${escaped}"`;
    });
    csvContent += values.join(',') + '\n';
  });
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseCSV = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n');
        
        if (lines.length < 2) {
          return resolve([]);
        }
        
        // Parse headers
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        // Parse data rows
        const result = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: Record<string, string> = {};
          
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          
          result.push(row);
        }
        
        resolve(result);
      } catch (error) {
        reject(new Error('Error parsing CSV file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
};
