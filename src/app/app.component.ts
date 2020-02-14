import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController, ToastController, AlertController } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { UserData } from './providers/user-data';
import { SwUpdate, UpdateAvailableEvent, SwPush } from '@angular/service-worker';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AppComponent implements OnInit {
  appPages = [
    {
      title: 'Schedule',
      url: '/app/tabs/schedule',
      icon: 'calendar'
    },
    {
      title: 'Speakers',
      url: '/app/tabs/speakers',
      icon: 'contacts'
    },
    {
      title: 'Map',
      url: '/app/tabs/map',
      icon: 'map'
    },
    {
      title: 'About',
      url: '/app/tabs/about',
      icon: 'information-circle'
    }
  ];

  Notification = Notification;

  loggedIn = false;
  dark = false;
  deferredPrompt;
  isInstallPromotionDisplayed = false;
  showBackdrop = false;
  notificationToast: HTMLIonToastElement;

  constructor(
    private menu: MenuController,
    private router: Router,
    private storage: Storage,
    private userData: UserData,
    private toast: ToastController,
    private swUpdate: SwUpdate,
    private swPush: SwPush,
    private alertController: AlertController
  ) {}

  async ngOnInit() {
    this.checkLoginStatus();
    this.listenForLoginEvents();
    this.handleAppUpdate();
    await this.showIosInstallBanner();
    this.hijackInstallPrompt();
    this.subscribeToWebPush();
    this.subscribeToNotificationClicks();
    this.subscribeToPushMessages();
  }

  private handleAppUpdate() {
    if (this.swUpdate.isEnabled) {
      this.swUpdate.available.subscribe(async (event: UpdateAvailableEvent) => {
        const alert = await this.alertController.create({
          header: `App update!`,
          message: `Newer version - v${(event.available.appData as any).version} is available.
                  Change log: ${(event.available.appData as any).changelog}`,
          buttons: [
            {
              text: 'Cancel',
              role: 'cancel',
              cssClass: 'secondary'
            },
            {
              text: 'Refresh',
              handler: () => {
                this.swUpdate.activateUpdate().then(() => window.location.reload());
              }
            }
          ]
        });

        await alert.present();
      });
    }
  }

  private async showIosInstallBanner() {
    // Put the functions for assertion here
    const isBannerShown = await this.storage.get('isBannerShown');
    if (this.isIos() && !this.isInStandaloneMode() && isBannerShown == null) {
      const toast = await this.toast.create({
        showCloseButton: true,
        closeButtonText: 'OK',
        cssClass: 'your-class-here-if-need-to-customize',
        position: 'bottom',
        message: `To install the app, tap "Share" icon below and select "Add to Home Screen".`
      });
      toast.present();
      this.storage.set('isBannerShown', true);
    }
  }

  private isIos() {
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  }

  private isInStandaloneMode() {
    return 'standalone' in (window as any).navigator && (window as any).navigator.standalone;
  }

  private hijackInstallPrompt() {
    window.addEventListener('beforeinstallprompt', e => {
      // Prevent Chrome 76 and later from showing the mini-infobar
      e.preventDefault();

      // Stash the event so it can be triggered later.
      this.deferredPrompt = e;

      // Toggle the install promotion display
      this.showInstallPromotion();
    });
  }

  private showInstallPromotion() {
    this.isInstallPromotionDisplayed = true;
  }

  private subscribeToWebPush() {
    if ('Notification' in window && Notification.permission === 'granted') {
      this.swPush
        .requestSubscription({
          serverPublicKey: `BGAh7wx3JgSMafhN28acKawZc2thMkrv3fS-CUOVUsablsyrUpvX1CrFQdyz78uKEANgBy6Hc2cyN7FhOarwJsc`
        })
        .then(sub => {
          console.log('subscribeToWebPush successful');
          console.log(JSON.stringify(sub));
        })
        .catch(err => {
          console.log('subscribeToWebPush error', err);
        });
    }
  }

  private navigateOnNotificationClick(notificationAction: string) {
    const [action, id] = notificationAction.split(':');

    if (action === 'speaker') {
      this.router.navigateByUrl(`/app/tabs/speakers/speaker-details/${id}`);
    } else if (action === 'session') {
      this.router.navigateByUrl(`/app/tabs/schedule/session/${id}`);
    }
  }

  subscribeToNotificationClicks() {
    this.swPush.notificationClicks.subscribe(msg => {
      console.log('notification click', msg);

      // If there's no action in notification payload, do nothing
      if (!msg.action) {
        return;
      }

      this.navigateOnNotificationClick(msg.action);
      // Hide the internal message when an action is tapped on system notification
      if (this.notificationToast) {
        this.notificationToast.dismiss();
      }
    });
  }

  private subscribeToPushMessages() {
    this.swPush.messages.subscribe(
      (msg: {
        notification: NotificationOptions & {
          title: string;
        };
      }) => {
        console.log('Received a message in client app', msg);
        // Only display the toast message if the app is in the foreground
        if (document.visibilityState === 'visible') {
          const toast = this.toast.create({
            showCloseButton: false,
            duration: 10000,
            cssClass: 'custom-toast',
            position: 'top',
            message: `${msg.notification.title}
<strong>${msg.notification.body}</strong>`,
            buttons: msg.notification.actions.map(actionEl => ({
              side: 'end',
              text: actionEl.title,
              handler: () => {
                this.navigateOnNotificationClick(actionEl.action);
              }
            }))
          });
          toast.then(res => {
            res.present();
            this.notificationToast = res;
          });
        }
      }
    );
  }

  requestNotificationPermission() {
    // We will use the backdrop to create user focus on permission dialog
    this.showBackdrop = true;

    if ('Notification' in window) {
      Notification.requestPermission()
        .then((permission: NotificationPermission) => {
          this.showBackdrop = false;

          if (permission === 'granted') {
            console.log('Notification permission is granted');

            // Since we have the permission now, let's subscribe to Web Push server
            this.subscribeToWebPush();
          } else {
            console.log('Notification permission is not granted: ', permission);
          }
        })
        .catch(err => {
          console.log('Error on requestNotificationPermission', err);
          this.showBackdrop = false;
        });
    }
  }
  showInstallPrompt() {
    this.showBackdrop = true;

    // Show the prompt
    this.deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    this.deferredPrompt.userChoice
      .then(choiceResult => {
        if (choiceResult.outcome === 'accepted') {
          // Hide the install promotion UI as user just installed it
          this.isInstallPromotionDisplayed = false;
          console.log('User accepted the A2HS prompt');
        } else {
          console.log('User dismissed the A2HS prompt');
        }
        this.deferredPrompt = null;
        this.showBackdrop = false;
      })
      .catch(() => {
        this.showBackdrop = false;
      });
  }

  checkLoginStatus() {
    return this.userData.isLoggedIn().then(loggedIn => {
      return this.updateLoggedInStatus(loggedIn);
    });
  }

  updateLoggedInStatus(loggedIn: boolean) {
    setTimeout(() => {
      this.loggedIn = loggedIn;
    }, 300);
  }

  listenForLoginEvents() {
    window.addEventListener('user:login', () => {
      this.updateLoggedInStatus(true);
    });

    window.addEventListener('user:signup', () => {
      this.updateLoggedInStatus(true);
    });

    window.addEventListener('user:logout', () => {
      this.updateLoggedInStatus(false);
    });
  }

  logout() {
    this.userData.logout().then(() => {
      return this.router.navigateByUrl('/app/tabs/schedule');
    });
  }

  openTutorial() {
    this.menu.enable(false);
    this.storage.set('ion_did_tutorial', false);
    this.router.navigateByUrl('/tutorial');
  }
}
