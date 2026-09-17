import { NextResponse } from 'next/server';

// Sample service categories and providers
const serviceCategories = [
  {
    id: 'utilities',
    name: 'Utilities',
    providers: [
      { id: 'electric-co', name: 'Electric Company', icon: 'zap' },
      { id: 'water-co', name: 'Water Services', icon: 'droplet' },
      { id: 'gas-co', name: 'Gas Provider', icon: 'flame' },
    ],
  },
  {
    id: 'telecom',
    name: 'Telecommunications',
    providers: [
      { id: 'internet-co', name: 'Internet Provider', icon: 'wifi' },
      { id: 'mobile-co', name: 'Mobile Service', icon: 'smartphone' },
      { id: 'cable-co', name: 'Cable TV', icon: 'tv' },
    ],
  },
  {
    id: 'govt',
    name: 'Government',
    providers: [
      { id: 'tax-agency', name: 'Tax Agency', icon: 'landmark' },
      { id: 'traffic-dept', name: 'Traffic Department', icon: 'car' },
      { id: 'city-services', name: 'City Services', icon: 'building' },
    ],
  },
  {
    id: 'education',
    name: 'Education',
    providers: [
      { id: 'university', name: 'University', icon: 'graduation-cap' },
      { id: 'school', name: 'School', icon: 'book' },
      { id: 'online-course', name: 'Online Courses', icon: 'monitor' },
    ],
  },
  {
    id: 'insurance',
    name: 'Insurance',
    providers: [
      { id: 'health-insurance', name: 'Health Insurance', icon: 'heart-pulse' },
      { id: 'car-insurance', name: 'Car Insurance', icon: 'car' },
      { id: 'home-insurance', name: 'Home Insurance', icon: 'home' },
    ],
  },
];

export async function GET() {
  return NextResponse.json({ categories: serviceCategories });
} 