/* eslint-disable @typescript-eslint/no-explicit-any */

'use client'

import { createContext, useContext } from 'react';

// Define types properly
type TryoutContextType = {
  value: any; // Replace 'any' with the actual type of your tryout data
  time: Date; // Assuming 'time' is a Date object
  currentSubtest: string
  initialAnswers: Array<{ kode_soal: string; jawaban: string }>
};

// Create the context with default `undefined`
const TryoutContext = createContext<TryoutContextType | undefined>(undefined);

// Provider component
export function TryoutDataProvider({ 
  children, 
  value,
  time,
  currentSubtest,
  initialAnswers
}: { 
  children: React.ReactNode; 
  value: any;  // Replace with actual type
  time: Date;  // Assuming time is a Date
  currentSubtest: string
  initialAnswers: Array<{ kode_soal: string; jawaban: string }>
}) {
  return (
    <TryoutContext.Provider value={{ value, time, currentSubtest, initialAnswers }}>
      {children}
    </TryoutContext.Provider>
  );
}

// Custom hook for consuming the context
export function useTryoutData() {
  const context = useContext(TryoutContext);
  if (!context) {
    throw new Error('useTryoutData must be used within a TryoutDataProvider');
  }
  return context;
}
