import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../../shared/hooks/useAuth';
import LoginPage from './LoginPage';
import api from '../../../shared/services/api';

// Mocks
vi.mock('../../../shared/services/api');

describe('LoginPage', () => {
  it('renders login form correctly', () => {
    render(
      <AuthProvider>
        <BrowserRouter>
          <LoginPage />
        </BrowserRouter>
      </AuthProvider>
    );

    expect(screen.getByText('Inicia sesión en tu cuenta')).toBeDefined();
    expect(screen.getByLabelText('Correo Electrónico')).toBeDefined();
    expect(screen.getByLabelText('Contraseña')).toBeDefined();
  });
});
