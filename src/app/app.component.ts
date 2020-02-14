import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { MenuController, ToastController } from '@ionic/angular';
import { Storage } from '@ionic/storage';
import { UserData } from './providers/user-data';

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
  loggedIn = false;
  dark = false;

  private isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());

  private isInStandaloneMode = () =>
    'standalone' in (window as any).navigator && (window as any).navigator.standalone;

  constructor(
    private menu: MenuController,
    private router: Router,
    private storage: Storage,
    private userData: UserData,
    private toast: ToastController
  ) {}

  async ngOnInit() {
    this.checkLoginStatus();
    this.listenForLoginEvents();
    await this.showIosInstallBanner();
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
