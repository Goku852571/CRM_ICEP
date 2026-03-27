import Swal, { SweetAlertIcon } from 'sweetalert2';

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (t) => {
    t.onmouseenter = Swal.stopTimer;
    t.onmouseleave = Swal.resumeTimer;
  },
});

export const showToast = (icon: SweetAlertIcon, title: string) => {
  toast.fire({ icon, title });
};

export const showSuccess = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'success',
    title,
    text,
    confirmButtonColor: '#2563EB',
    timer: 2500,
    timerProgressBar: true,
  });
};

export const showError = (title: string, text?: string) => {
  return Swal.fire({
    icon: 'error',
    title,
    text,
    confirmButtonColor: '#2563EB',
  });
};

export const showConfirm = async (
  title: string,
  text: string,
  confirmText = 'Sí, confirmar',
  cancelText = 'Cancelar',
  icon: SweetAlertIcon = 'warning'
) => {
  const result = await Swal.fire({
    icon,
    title,
    text,
    showCancelButton: true,
    confirmButtonColor: '#2563EB',
    cancelButtonColor: '#6B7280',
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
  });
  return result.isConfirmed;
};

export const showConfirmDanger = async (title: string, text: string) => {
  const result = await Swal.fire({
    icon: 'warning',
    title,
    text,
    showCancelButton: true,
    confirmButtonColor: '#DC2626',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
  });
  return result.isConfirmed;
};

export default Swal;
