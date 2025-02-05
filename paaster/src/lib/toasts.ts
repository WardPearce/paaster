import { Notyf } from 'notyf';

export function getToast() {
  return new Notyf({
    duration: 10000,
    position: {
      x: 'center',
      y: 'top'
    },
  });
}