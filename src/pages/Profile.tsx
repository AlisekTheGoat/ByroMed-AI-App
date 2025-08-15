import React from 'react';

const Profile = () => {
  const user = {
    name: 'MUDr. Jan Novotný',
    email: 'jan.novotny@byromed.cz',
    role: 'Hlavní lékař',
    phone: '+420 123 456 789',
    specialization: 'Praktický lékař',
    location: 'Praha 1, Česká republika',
    bio: 'Specializuji se na preventivní medicínu a léčbu chronických onemocnění. Věnuji se také výzkumu v oblasti kardiovaskulárních onemocnění.',
    stats: [
      { label: 'Pacienti', value: '1,248' },
      { label: 'Návštěvy', value: '5,672' },
      { label: 'Hodnocení', value: '4.9/5' },
    ],
    availability: [
      { day: 'Pondělí', hours: '8:00 - 16:00' },
      { day: 'Úterý', hours: '8:00 - 16:00' },
      { day: 'Středa', hours: '8:00 - 12:00' },
      { day: 'Čtvrtek', hours: '8:00 - 16:00' },
      { day: 'Pátek', hours: '8:00 - 14:00' },
      { day: 'Sobota', hours: 'Zavřeno' },
      { day: 'Neděle', hours: 'Zavřeno' },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Můj profil</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Spravujte svůj veřejný profil a osobní údaje
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <div className="card p-6">
            <div className="flex flex-col items-center">
              <div className="h-32 w-32 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-4xl font-bold text-blue-600 dark:text-blue-300 mb-4">
                JN
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{user.name}</h2>
              <p className="text-blue-600 dark:text-blue-400">{user.role}</p>
              
              <div className="mt-6 w-full space-y-3">
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {user.email}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {user.phone}
                </div>
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <svg className="h-5 w-5 text-gray-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {user.specialization}
                </div>
                <div className="flex items-start text-sm text-gray-600 dark:text-gray-300">
                  <svg className="h-5 w-5 text-gray-400 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {user.location}
                </div>
              </div>

              <div className="mt-6 w-full">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">O mně</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">{user.bio}</p>
              </div>

              <div className="mt-6 w-full">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Statistiky</h3>
                <div className="grid grid-cols-3 gap-4">
                  {user.stats.map((stat, index) => (
                    <div key={index} className="text-center">
                      <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400">{stat.value}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button className="mt-6 w-full btn btn-outline">
                Upravit profil
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">Dostupnost</h2>
            
            <div className="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Den
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Otevírací doba
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {user.availability.map((day, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}> 
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {day.day}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {day.hours}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <button className="btn btn-outline">
                Upravit dostupnost
              </button>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Ověření</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                Ověřeno
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">E-mailová adresa</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ověřeno 15. března 2023</p>
                  </div>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  Změnit
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                    <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Telefonní číslo</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Ověřeno 10. března 2023</p>
                  </div>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  Změnit
                </button>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <svg className="h-5 w-5 text-yellow-500 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Ověření totožnosti</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Čeká na ověření</p>
                  </div>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
                  Ověřit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
