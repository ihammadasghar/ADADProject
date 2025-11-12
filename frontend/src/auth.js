import { AppConfig, UserSession, showConnect } from '@stacks/connect';
import { Person } from '@stacks/profile';

const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

export function authenticate() {
  showConnect({
    appDetails: {
      name: 'ADAD Project',
      icon: window.location.origin + '/logo512.png',
    },
    redirectTo: '/',
    onFinish: () => {
      window.location.reload();
    },
    onCancel: () => {
      console.log('cancelled');
    },
    userSession: userSession,
  });
}

export function getUserData() {
  return userSession.loadUserData();
}

export function getPerson() {
  return new Person(getUserData().profile);
}