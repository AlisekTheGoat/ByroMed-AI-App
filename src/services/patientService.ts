import { PrismaClient, Patient } from '@prisma/client';
import { ipcRenderer } from 'electron';

const prisma = new PrismaClient();

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
      const skip = (page - 1) * pageSize;
      const [patients, total] = await Promise.all([
        prisma.patient.findMany({
          skip,
          take: pageSize,
          orderBy: { lastName: 'asc' },
        }),
        prisma.patient.count(),
      ]);

      return {
        data: patients,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      console.error('Error fetching patients:', error);
      throw error;
    }
  },

  // Get a single patient by ID
  async getPatientById(id: string) {
    try {
      return await prisma.patient.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error(`Error fetching patient with ID ${id}:`, error);
      throw error;
    }
  },

  // Create a new patient
  async createPatient(patientData: PatientInput) {
    try {
      return await prisma.patient.create({
        data: patientData,
      });
    } catch (error) {
      console.error('Error creating patient:', error);
      throw error;
    }
  },

  // Update an existing patient
  async updatePatient(id: string, patientData: Partial<PatientInput>) {
    try {
      return await prisma.patient.update({
        where: { id },
        data: patientData,
      });
    } catch (error) {
      console.error(`Error updating patient with ID ${id}:`, error);
      throw error;
    }
  },

  // Delete a patient
  async deletePatient(id: string) {
    try {
      return await prisma.patient.delete({
        where: { id },
      });
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
      const patients = await prisma.patient.findMany({
        orderBy: { lastName: 'asc' },
      });
      
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
      patients.forEach(patient => {
        const row = [
          `"${patient.firstName || ''}"`,
          `"${patient.lastName || ''}"`,
          `"${patient.birthNumber || ''}"`,
          `"${patient.dateOfBirth?.toISOString().split('T')[0] || ''}"`,
          `"${patient.gender || ''}"`,
          `"${patient.phone || ''}"`,
          `"${patient.email || ''}"`,
          `"${patient.insurance || ''}"`,
          `"${patient.insuranceCode || ''}"`,
          `"${patient.address || ''}"`,
          `"${patient.city || ''}"`,
          `"${patient.employerOrSchool || ''}"`,
          `"${patient.notes || ''}"`,
          `"${patient.createdAt.toISOString()}"`,
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
