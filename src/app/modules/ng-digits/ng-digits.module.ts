import { DigitsDirective } from './digits.directive';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

@NgModule({
  imports: [
    CommonModule
  ],
  declarations: [DigitsDirective],
  exports: [DigitsDirective]
})
export class NgDigitsModule { }
