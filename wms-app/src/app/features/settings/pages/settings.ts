import { Component } from '@angular/core';
import { CompanyForm } from '../components/company-form/company-form';
import { UsersList } from '../components/users/users-list';
import { CompanyLogo } from '../components/company-logo/company-logo';

@Component({
  selector: 'app-settings',
  imports: [CompanyForm, CompanyLogo, UsersList],
  templateUrl: './settings.html',
})
export class Settings {}
