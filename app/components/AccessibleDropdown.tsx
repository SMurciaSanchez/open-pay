import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface DropdownOption {
  id: string;
  label: string;
  value: string;
}

interface AccessibleDropdownProps {
  id: string;
  label: string;
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
  className?: string;
}

/**
 * Componente de dropdown totalmente accesible que cumple con las pautas WCAG 2.1
 * - Navegable por teclado (↑, ↓, Enter, Esc, Space)
 * - Soporte completo de ARIA
 * - Anuncios para lectores de pantalla
 * - Alto contraste visual
 */
export const AccessibleDropdown: React.FC<AccessibleDropdownProps> = ({
  id,
  label,
  options,
  value,
  onChange,
  disabled = false,
  error,
  required = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLUListElement>(null);
  const selectedOption = options.find(option => option.value === value);

  // Abrir/cerrar dropdown
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      
      // Al abrir, establecer el foco en la opción seleccionada o la primera
      if (!isOpen) {
        const selectedIndex = options.findIndex(option => option.value === value);
        setFocusedIndex(selectedIndex >= 0 ? selectedIndex : 0);
      }
    }
  };

  // Seleccionar una opción
  const selectOption = (option: DropdownOption) => {
    onChange(option.value);
    setIsOpen(false);
    
    // Devolver el foco al botón después de seleccionar
    if (dropdownRef.current) {
      const button = dropdownRef.current.querySelector('button');
      if (button) button.focus();
    }
  };

  // Gestionar navegación por teclado
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex(prev => (prev + 1) % options.length);
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(options.length - 1);
        } else {
          setFocusedIndex(prev => (prev - 1 + options.length) % options.length);
        }
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen && focusedIndex >= 0) {
          selectOption(options[focusedIndex]);
        } else {
          toggleDropdown();
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
        
      case 'Tab':
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
        }
        break;
        
      default:
        // Navegación rápida por primera letra
        const key = e.key.toLowerCase();
        if (/^[a-z0-9]$/.test(key)) {
          const matchIndex = options.findIndex(option => 
            option.label.toLowerCase().startsWith(key)
          );
          if (matchIndex >= 0) {
            setFocusedIndex(matchIndex);
            if (!isOpen) setIsOpen(true);
          }
        }
        break;
    }
  };

  // Cerrar dropdown cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) && 
        isOpen
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Desplazar la opción enfocada a la vista
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && optionsRef.current) {
      const optionElements = optionsRef.current.querySelectorAll('li');
      if (optionElements[focusedIndex]) {
        optionElements[focusedIndex].scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [focusedIndex, isOpen]);

  // ID único para conectar label y listbox
  const listboxId = `${id}-listbox`;
  
  return (
    <div 
      className={`relative w-full ${className}`}
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
    >
      {/* Label */}
      <label 
        id={`${id}-label`}
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      
      {/* Dropdown button */}
      <button
        id={id}
        type="button"
        className={`relative w-full bg-white border ${
          error ? 'border-red-500' : 'border-gray-300'
        } rounded-md py-2 pl-3 pr-10 text-left focus:outline-none focus:ring-2 ${
          error ? 'focus:ring-red-500' : 'focus:ring-blue-500'
        } focus:border-transparent ${
          disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'cursor-pointer'
        }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={`${id}-label`}
        aria-controls={listboxId}
        aria-invalid={!!error}
        aria-required={required}
        aria-disabled={disabled}
        onClick={toggleDropdown}
        disabled={disabled}
      >
        <span className="block truncate">
          {selectedOption ? selectedOption.label : 'Selecciona una opción'}
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg 
            className="h-5 w-5 text-gray-400" 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            aria-hidden="true"
          >
            <path 
              fillRule="evenodd" 
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
              clipRule="evenodd" 
            />
          </svg>
        </span>
      </button>
      
      {/* Dropdown options */}
      {isOpen && (
        <ul
          id={listboxId}
          ref={optionsRef}
          className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm"
          role="listbox"
          aria-labelledby={`${id}-label`}
          tabIndex={-1}
        >
          {options.map((option, index) => (
            <li
              key={option.id}
              id={`${id}-option-${option.id}`}
              className={`cursor-pointer select-none relative py-2 pl-3 pr-9 ${
                focusedIndex === index ? 'bg-blue-100' : ''
              } ${option.value === value ? 'text-blue-900 font-medium' : 'text-gray-900'}`}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={disabled}
              onClick={() => selectOption(option)}
              data-focused={focusedIndex === index}
            >
              <span className={`block truncate ${
                option.value === value ? 'font-medium' : 'font-normal'
              }`}>
                {option.label}
              </span>
              
              {option.value === value && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      
      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600" id={`${id}-error`} aria-live="polite">
          {error}
        </p>
      )}
    </div>
  );
};

export default AccessibleDropdown; 