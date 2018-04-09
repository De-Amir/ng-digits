import { Directive, HostListener, Renderer2, ElementRef, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NgModel } from '@angular/forms';

/**
 * Constants
 */
const _NUMBER_FORMAT_REGEXP = /^(\d+)?\.((\d+)(-(\d+))?)?$/;
const jpMapChar = {
  '１': '1', '２': '2', '３': '3', '４': '4', '５': '5', '６': '6', '７': '7', '８': '8', '９': '9', '０': '0',
  '。': '.', '．': '.', '＋': '+', 'ー': '-'
};
const NUMBERS = /[0-9]+/g;
const FLOAT_NUMBER = /[+-]?([0-9]*[.])?[0-9]+/g;
const allowedKeyCodes = [8, 9, 13, 35, 36, 37, 38, 39, 40, 46];
const allowedKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const defaultValue = '';

@Directive({
  selector: '[appDigits][formControlName],[appDigits][formControl],[appDigits][ngModel],[appDigits]'
})
export class DigitsDirective {
  @Input() appDigits: [string];
  @Input() maxDigits: number;
  // @Output() onEnter = new EventEmitter();
  @Output() ngModelChange: EventEmitter<any> = new EventEmitter();
  @Output() change: EventEmitter<any> = new EventEmitter();
  startValue: any;

  @HostListener('focus', ['$event'])
  @HostListener('blur', ['$event'])
  onFocusEvent(event: FocusEvent) {
    const value = (<HTMLInputElement>event.target).value;

    switch (event.type) {
      case 'focus':
        this.startValue = value;
        break;
      case 'blur':
        if (this.startValue !== value) {
          this.transformInput(value, event);
        }
        this.startValue = null;
        break;
      default:
      // NOP
    }
  }

  /**
   * Transform to decimal
   */
  transformInput(value, event) {

    let matchNumberRegex = NUMBERS;

    if (this.appDigits && this.appDigits[0]) {
      const digits = this.appDigits[0];
      const parts = digits.match(_NUMBER_FORMAT_REGEXP);
      if (parts === null) {
        throw new Error(`${digits} is not a valid digit info for number pipes`);
      }
      if (parts[3] != null) {  // min fraction digits
        matchNumberRegex = FLOAT_NUMBER;
      }
    }
    let filteredValue = this.filterInputValue(value, matchNumberRegex);
    filteredValue = this.maxDigitsTransform(filteredValue);

    this.element.nativeElement.value = this.parseInputValue(filteredValue);
    this.ngModelChange.emit(this.element.nativeElement.value);
    this.change.emit(event);
  }

  /**
   * Filter input value
   */
  filterInputValue(value: string, matchNumberRegex: RegExp) {
    let filteredValue = value;
    if (filteredValue) {
      filteredValue = value.replace(/[^\d.]/g, function (n) { return jpMapChar[n] || n; });
      const matchArray = filteredValue.match(matchNumberRegex);
      filteredValue = matchArray ? matchArray.join('') : '';
    }
    return filteredValue;
  }

  /**
   * Transform input to decimal
   */
  transformDecimal(value: string) {
    const decimalFormat = new DecimalPipe(this.appDigits[1] || 'en');

    return decimalFormat.transform(value, this.appDigits[0]);
  }

  /**
   * Parse user input value
   */
  parseInputValue(filteredValue: string) {
    filteredValue = filteredValue.replace(/,/g, '');
    let parsedValue = 0;
    let valueFormat = '';

    if (this.appDigits) {
      parsedValue = parseFloat(filteredValue);
      valueFormat = isNaN(parsedValue) ? '' : this.transformDecimal(String(parsedValue));
    } else {
      parsedValue = parseFloat(filteredValue);
      valueFormat = isNaN(parsedValue) ? '' : String(parsedValue);
    }

    return valueFormat;
  }

  /**
   * Transform input under max digits
   */
  maxDigitsTransform(value: string) {
    if (!value || value === '' || !this.maxDigits) {
      return value;
    }
    const maxDigits = Number(this.maxDigits);
    let fraction = 0;
    if (this.appDigits && this.appDigits[0]) {
      value = value.replace(/,/g, '');
      const digits = this.appDigits[0];
      const parts = digits.match(_NUMBER_FORMAT_REGEXP);
      if (parts === null) {
        throw new Error(`${digits} is not a valid digit info for number pipes`);
      }
      if (parts[3] != null) {  // min fraction digits
        fraction = Number(parts[3]);
      }
      const valueParts = value.match(_NUMBER_FORMAT_REGEXP);
      if (valueParts) {
        if (valueParts[1] != null) {  // min integer digits
          value = valueParts[1].substring(0, maxDigits - fraction);
        }
        if (valueParts[3] != null) {  // min fraction digits
          value = `${value}.${valueParts[3].substring(0, fraction)}`;
        }

         return this.transformDecimal(value);
      } else {
        return this.transformDecimal(value.substring(0, maxDigits - fraction));
      }
    } else if (value.length > maxDigits - 1) {
      value = value.replace(/,/g, '');
      return  this.transformDecimal(value.substring(0, maxDigits));
    }
    return value;
  }

  /**
   * Handle click event
   */
  @HostListener('click', ['$event'])
  onClickEvent(event: Event) {
    const value = (<HTMLInputElement>event.target).value;

    /**
     * Get pointer position
     */
    const startPointer = this.element.nativeElement.selectionStart;
    const endPointer = this.element.nativeElement.selectionEnd;
    const commaArray = value.substring(0, startPointer).match(/,/g);
    const commaCounter = commaArray ? commaArray.length : 0;

    /**
     * Set value without comma
     */
    const newValue = value.replace(/,/g, '');
    this.element.nativeElement.value = newValue;

    /**
     * Set new pointer position
     */
    this.setSelectionRange(startPointer - commaCounter, endPointer - commaCounter);
  }


  /* direction: left 37, up 38, right 39, down 40
  // backspace: 8
  // tab      : 9
  // enter    : 13
  // delete   : 46
  // end      : 35
  // home     : 36
  */
  @HostListener('keydown', ['$event'])
  @HostListener('keyup', ['$event'])
  onAppKeyPress(event) {

    const value = (<HTMLInputElement>event.target).value;
    // Get pointer position
    const startPointer = this.element.nativeElement.selectionStart;
    const endPointer = this.element.nativeElement.selectionEnd;
    const notSelected = Number(startPointer) === Number(endPointer);




    // Chack input type
    if (this.appDigits && this.appDigits[0]) {
      const digits = this.appDigits[0];
      const parts = digits.match(_NUMBER_FORMAT_REGEXP);
      if (parts === null) {
        throw new Error(`${digits} is not a valid digit info for number pipes`);
      }
      if (parts[1] != null) {  // min integer digits

      }
      if (parts[3] != null) {  // min fraction digits
        if (!this.processDecimalOnKeyPress(value, event, parts, notSelected, startPointer, endPointer)) {
          return false;
        }
      }
      if (parts[5] != null) {  // max fraction digits

      }
    } else {
      // Check for max length for integer
      if (value
        && (this.maxDigits
          && Number(this.maxDigits) > 0)
        && value.length > Number(this.maxDigits) - 1
        && allowedKeys.indexOf(event.key) > -1) {
        if (startPointer === endPointer) {

          return false;
        }

      }
    }

    const key = event.key;
    const keyCode = event.keyCode;
    const code = event.code;
    const ctrl = event.ctrlKey ? event.ctrlKey : ((keyCode === 17) ? true : false); // ctrl detection

    if (!this.onEnterInput(code, key, event)) {
      return false;
    }

    if (!this.checkHotKeyInput(key, keyCode, ctrl)) {
      return false;
    }

  }

  /**
   * Process decimal input on key press
   */
  processDecimalOnKeyPress(value, event, parts, notSelected, startPointer, endPointer) {
    const maxDigits = Number(this.maxDigits);
    if (!notSelected && (Number(endPointer) - Number(startPointer)) === 1 && value[startPointer] === '.') {
      return false;
    }
    const dotIndex = value.indexOf('.');
    if ((event.key === '.' || event.key === 'Decimal') && dotIndex > -1) {
      return false;
    }
    const valueParts = value ? value.match(_NUMBER_FORMAT_REGEXP) : null;

    const decimalLength = Number(parts[3]);
    const integerLength = maxDigits - decimalLength;
    allowedKeys.push('.', 'Decimal');
    if (valueParts) {
      if (valueParts[1]
        && notSelected
        && (valueParts[1].length > integerLength - 1)
        && allowedKeys.indexOf(event.key) > -1
        && (dotIndex > -1 && startPointer <= dotIndex)
      ) {

        return false;

      }
      if (valueParts[3]
        && notSelected
        && (valueParts[3].length > decimalLength - 1)
        && allowedKeys.indexOf(event.key) > -1
        && (dotIndex > -1 && startPointer > dotIndex)
      ) {

        return false;

      }
    } else {
      // Check for max length for decimal
      if (value
        && (this.maxDigits && maxDigits > 0)
        && value.length > integerLength - 1
        && allowedKeys.indexOf(event.key) > -1 && (event.key !== '.' && event.key !== 'Decimal')) {
        if (startPointer === endPointer) {

          return false;
        }

      }
    }

    return true;

  }

  /**
   * Handle on Enter input
   */
  onEnterInput(code, key, event) {
    const value = (<HTMLInputElement>event.target).value;
    // Transform input on Enter
    if ((
      code === 'Enter' || code === 'NumpadEnter' || code === 13
      || key === 'Enter' || key === 'NumpadEnter' || key === 13
    )) {

      const scope = this;

      // Change input after process editor
      setTimeout(function () {
        scope.transformInput(value, event);
      }, 50);
      return false;
    }
    return true;

  }

  /**
   * Check for hot key input
   */
  checkHotKeyInput(key, keyCode, ctrl) {
    // Ctrl + A/C/V/X detection
    const isCtrlA = (keyCode === 65 && ctrl);
    const isCtrlC = (keyCode === 67 && ctrl);
    const isCtrlV = (keyCode === 86 && ctrl);
    const isCtrlX = (keyCode === 88 && ctrl);
    if (allowedKeyCodes.indexOf(keyCode) === -1
      && allowedKeys.indexOf(key) === -1
      && !isCtrlA
      && !isCtrlC
      && !isCtrlV
      && !isCtrlX
    ) {
      return false;
    }
    return true;
  }

  /**
   * Creates an instance of DigitsDirective.
   */
  constructor(private element: ElementRef, private renderer: Renderer2) {
  }

  /**
   * Set selection range of input
   */
  setSelectionRange(start, end) {
    this.renderer.setProperty(this.element.nativeElement, 'selectionStart', start);
    this.renderer.setProperty(this.element.nativeElement, 'selectionEnd', end);
  }

  /**
   * Parse string to number
   */
  parseIntAutoRadix(text: string): number {
    const result: number = parseInt(text, 10);
    if (isNaN(result)) {
      throw new Error('Invalid integer literal when parsing ' + text);
    }
    return result;
  }


  /**
   * Count a ltter in string
   */
  countLetter(input, letter) {
    return (input.match(RegExp(letter, 'g')) || []).length;
  }

}
