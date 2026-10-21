import { Component } from '@angular/core';
import { CompanyForm } from '../components/company-form/company-form';
import { UsersList } from '../components/users/users-list';

@Component({
  selector: 'app-settings',
  imports: [CompanyForm, UsersList],
  templateUrl: './settings.html',
})
export class Settings {}
