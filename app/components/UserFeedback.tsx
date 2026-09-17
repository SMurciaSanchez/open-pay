import React, { useState } from 'react';

interface FeedbackFormProps {
  onSubmit: (data: FeedbackData) => void;
  onClose: () => void;
}

export interface FeedbackData {
  rating: number;
  feedback: string;
  category: 'usability' | 'performance' | 'design' | 'feature' | 'other';
  screenshot?: File;
}

const RATING_LABELS = {
  1: 'Muy insatisfecho',
  2: 'Insatisfecho',
  3: 'Neutral',
  4: 'Satisfecho',
  5: 'Muy satisfecho'
};

const CATEGORY_LABELS = {
  usability: 'Usabilidad',
  performance: 'Rendimiento',
  design: 'Diseño',
  feature: 'Funcionalidad',
  other: 'Otro'
};

export const UserFeedback: React.FC<FeedbackFormProps> = ({ onSubmit, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [category, setCategory] = useState<FeedbackData['category']>('usability');
  const [screenshot, setScreenshot] = useState<File | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setScreenshot(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit({
        rating,
        feedback,
        category,
        screenshot
      });
      
      // Reset form
      setRating(0);
      setFeedback('');
      setCategory('usability');
      setScreenshot(undefined);
      
      // Close form after successful submission
      setTimeout(() => {
        handleClose();
      }, 500);
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Feedback button that's always visible
  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-5 right-5 bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center"
        aria-label="Dar feedback"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10c0 4.418-3.582 8-8 8a7.962 7.962 0 01-4.076-1.113l-4.414 1.48.617-3.683A7.975 7.975 0 010 10c0-4.418 3.582-8 8-8s8 3.582 8 8zM7 9a1 1 0 11-2 0 1 1 0 012 0zm3 1a1 1 0 100-2 1 1 0 000 2zm4-1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
        </svg>
        <span className="ml-2 hidden md:inline">Feedback</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">¿Cómo ha sido tu experiencia?</h2>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Cerrar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            {/* Rating */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ¿Cómo calificarías tu experiencia?
              </label>
              <div className="flex justify-between">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      rating === value ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    title={RATING_LABELS[value as keyof typeof RATING_LABELS]}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <div className="text-center mt-2 text-sm text-gray-500">
                {rating > 0 ? RATING_LABELS[rating as keyof typeof RATING_LABELS] : 'Selecciona una calificación'}
              </div>
            </div>
            
            {/* Category */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FeedbackData['category'])}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Feedback text */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tu feedback
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 min-h-[100px]"
                placeholder="Cuéntanos tu experiencia o sugerencias para mejorar..."
                required
              />
            </div>
            
            {/* Screenshot */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Adjuntar captura de pantalla (opcional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleScreenshotChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              {screenshot && (
                <div className="mt-2 text-sm text-green-600">
                  Archivo seleccionado: {screenshot.name}
                </div>
              )}
            </div>
            
            {/* Submit button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="mr-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={isSubmitting || rating === 0 || feedback.trim() === ''}
              >
                {isSubmitting ? 'Enviando...' : 'Enviar feedback'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Ejemplo de uso:
export const FeedbackExample: React.FC = () => {
  const handleFeedbackSubmit = (data: FeedbackData) => {
    console.log('Feedback submitted:', data);
    // Aquí se enviaría a un servicio de backend
    alert('¡Gracias por tu feedback!');
  };

  return (
    <UserFeedback 
      onSubmit={handleFeedbackSubmit}
      onClose={() => console.log('Feedback form closed')}
    />
  );
};

export default UserFeedback; 