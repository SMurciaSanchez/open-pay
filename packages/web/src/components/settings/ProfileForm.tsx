'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { User, UserCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { updateProfile } from '@/lib/user';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export function ProfileForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  });
  const [errors, setErrors] = useState<Partial<ProfileFormData>>({});

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsFetching(true);
        const profile = await api.getProfile();
        setProfileId(profile.id);
        const nameParts = (profile.fullName || '').split(' ');
        setFormData({
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: profile.email || '',
          phone: profile.phone || ''
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
        toast({
          title: 'Error',
          description: 'No se pudo cargar tu información de perfil',
          variant: 'destructive'
        });
      } finally {
        setIsFetching(false);
      }
    };

    fetchUserProfile();
  }, [toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when typing
    if (errors[name as keyof ProfileFormData]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ProfileFormData> = {};

    if (!formData.firstName) {
      newErrors.firstName = 'El nombre es requerido';
    }

    if (!formData.lastName) {
      newErrors.lastName = 'El apellido es requerido';
    }

    if (!formData.email) {
      newErrors.email = 'El correo electrónico es requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El correo electrónico no es válido';
    }

    if (!formData.phone) {
      newErrors.phone = 'El número de teléfono es requerido';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Ingresa un número de teléfono válido de 10 dígitos';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      if (profileId) {
        await updateProfile(profileId, {
          fullName: `${formData.firstName} ${formData.lastName}`.trim(),
          phone: formData.phone,
        });
      }

      toast({
        title: 'Perfil actualizado',
        description: 'Tu información personal ha sido actualizada exitosamente',
      });
    } catch (error: unknown) {
      console.error('Error al actualizar perfil:', error);

      toast({
        title: 'Error al actualizar perfil',
        description: error instanceof Error ? error.message : 'Ha ocurrido un error al actualizar tu información',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <div className="flex items-center space-x-3">
            <UserCircle2 className="h-6 w-6 text-primary" />
            <CardTitle>Información personal</CardTitle>
          </div>
          <CardDescription>
            Cargando información...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="h-5 w-32 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center space-x-3">
          <UserCircle2 className="h-6 w-6 text-primary" />
          <CardTitle>Información personal</CardTitle>
        </div>
        <CardDescription>
          Actualiza tus datos personales y de contacto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="Tu nombre"
                value={formData.firstName}
                onChange={handleChange}
                disabled={isLoading}
                className={errors.firstName ? 'border-red-500' : ''}
              />
              {errors.firstName && (
                <p className="text-xs text-red-500">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Tu apellido"
                value={formData.lastName}
                onChange={handleChange}
                disabled={isLoading}
                className={errors.lastName ? 'border-red-500' : ''}
              />
              {errors.lastName && (
                <p className="text-xs text-red-500">{errors.lastName}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="tucorreo@ejemplo.com"
              value={formData.email}
              onChange={handleChange}
              disabled={true} // Email shouldn't be editable without verification
              className="bg-gray-50"
            />
            <p className="text-xs text-muted-foreground">
              No puedes modificar tu correo electrónico directamente. Contacta a soporte si necesitas cambiarlo.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              placeholder="10 dígitos"
              value={formData.phone}
              onChange={handleChange}
              disabled={isLoading}
              className={errors.phone ? 'border-red-500' : ''}
            />
            {errors.phone && (
              <p className="text-xs text-red-500">{errors.phone}</p>
            )}
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? 'Guardando...' : 'Guardar cambios'}
        </Button>
      </CardFooter>
    </Card>
  );
} 