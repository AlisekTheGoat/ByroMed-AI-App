// Renderer-side service now uses Electron IPC exposed via window.api.patients
// to avoid bundling Prisma in the renderer and to stabilize data access.

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  birthNumber: string;
  dateOfBirth?: string | Date | null;
  gender: string;
  phone?: string | null;
  email?: string | null;
  insurance?: string | null;
  insuranceCode?: string | null;
  address?: string | null;
  city?: string | null;
  employerOrSchool?: string | null;
  notes?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

interface PatientInput {
  firstName: string;
  lastName: string;
  birthNumber: string;
  dateOfBirth?: Date | null;
  gender: string;
  phone?: string;
  email?: string;
  insurance?: string;
  insuranceCode?: string;
  address?: string;
  city?: string;
  employerOrSchool?: string;
  notes?: string;
}

export const PatientService = {
  // Get all patients with pagination
  async getPatients(page: number = 1, pageSize: number = 10) {
    try {
      const res = await window.api.patients.list(page, pageSize);
      return res;
    } catch (error) {
      console.error('Error fetching patients:', error);
      throw error;
    }
  },

  // Get a single patient by ID
  async getPatientById(id: string) {
    try {
      return await window.api.patients.get(id);
    } catch (error) {
      console.error(`Error fetching patient with ID ${id}:`, error);
      throw error;
    }
  },

  // Create a new patient
  async createPatient(patientData: PatientInput) {
    try {
      return await window.api.patients.create(patientData);
    } catch (error) {
      console.error('Error creating patient:', error);
      throw error;
    }
  },

  // Update an existing patient
  async updatePatient(id: string, patientData: Partial<PatientInput>) {
    try {
      return await window.api.patients.update(id, patientData);
    } catch (error) {
      console.error(`Error updating patient with ID ${id}:`, error);
      throw error;
    }
  },

  // Delete a patient
  async deletePatient(id: string) {
    try {
      await window.api.patients.delete(id);
      return true;
    } catch (error) {
      console.error(`Error deleting patient with ID ${id}:`, error);
      throw error;
    }
  },

  // Import patients from CSV
  async importPatientsFromCSV(file: File) {
    try {
      // Read the file content
      const text = await file.text();
      
      // Parse CSV
      const rows = text.split('\n').filter(row => row.trim() !== '');
      const headers = rows[0].split(',').map(h => h.trim());
      
      const patients = [];
      
      for (let i = 1; i < rows.length; i++) {
        const values = rows[i].split(',').map(v => v.trim());
        const patientData: any = {};
        
        headers.forEach((header, index) => {
          patientData[header] = values[index] || '';
        });
        
        // Map CSV data to patient model
        const patient: PatientInput = {
          firstName: patientData['firstName'] || patientData['Jméno'] || '',
          lastName: patientData['lastName'] || patientData['Příjmení'] || '',
          birthNumber: patientData['birthNumber'] || patientData['Rodné číslo'] || '',
          dateOfBirth: patientData['dateOfBirth'] || patientData['Datum narození'] ? 
            new Date(patientData['dateOfBirth'] || patientData['Datum narození']) : null,
          gender: patientData['gender'] || patientData['Pohlaví'] || '',
          phone: patientData['phone'] || patientData['Telefon'] || '',
          email: patientData['email'] || patientData['Email'] || '',
          insurance: patientData['insurance'] || patientData['Pojišťovna'] || '',
          insuranceCode: patientData['insuranceCode'] || patientData['Kód pojišťovny'] || '',
          address: patientData['address'] || patientData['Adresa'] || '',
          city: patientData['city'] || patientData['Město'] || '',
          employerOrSchool: patientData['employerOrSchool'] || patientData['Zaměstnání/Škola'] || '',
          notes: patientData['notes'] || patientData['Poznámky'] || '',
        };
        
        patients.push(patient);
      }
      
      // Create patients in database
      const createdPatients = [];
      for (const patient of patients) {
        try {
          const created = await this.createPatient(patient);
          createdPatients.push(created);
        } catch (error) {
          console.error(`Error importing patient ${patient.firstName} ${patient.lastName}:`, error);
        }
      }
      
      return createdPatients;
    } catch (error) {
      console.error('Error importing patients from CSV:', error);
      throw error;
    }
  },

  // Export patients to CSV
  async exportPatientsToCSV() {
    try {
      // Fetch a large page to export all (simple approach). Adjust if dataset grows large.
      const { data: patients } = await window.api.patients.list(1, 10000);
      
      if (patients.length === 0) {
        throw new Error('No patients found to export');
      }
      
      // Define CSV headers
      const headers = [
        'Jméno',
        'Příjmení',
        'Rodné číslo',
        'Datum narození',
        'Pohlaví',
        'Telefon',
        'Email',
        'Pojišťovna',
        'Kód pojišťovny',
        'Adresa',
        'Město',
        'Zaměstnání/Škola',
        'Poznámky',
        'Datum vytvoření',
      ];
      
      // Create CSV content
      let csvContent = headers.join(',') + '\n';
      
      // Add patient data
      patients.forEach((patient: any) => {
        const row = [
          `"${patient.firstName || ''}"`,
          `"${patient.lastName || ''}"`,
          `"${patient.birthNumber || ''}"`,
          `"${(patient.dateOfBirth ? new Date(patient.dateOfBirth) : null)?.toISOString().split('T')[0] || ''}"`,
          `"${patient.gender || ''}"`,
          `"${patient.phone || ''}"`,
          `"${patient.email || ''}"`,
          `"${patient.insurance || ''}"`,
          `"${patient.insuranceCode || ''}"`,
          `"${patient.address || ''}"`,
          `"${patient.city || ''}"`,
          `"${patient.employerOrSchool || ''}"`,
          `"${patient.notes || ''}"`,
          `"${(patient.createdAt ? new Date(patient.createdAt) : new Date()).toISOString()}"`,
        ];
        
        csvContent += row.join(',') + '\n';
      });
      
      // Create a blob and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `pacienti_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { success: true, count: patients.length };
    } catch (error) {
      console.error('Error exporting patients to CSV:', error);
      throw error;
    }
  },
};

export default PatientService;
