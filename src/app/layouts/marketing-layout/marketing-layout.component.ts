import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from '../../shared/footer/footer.component';

@Component({
  selector: 'app-marketing-layout',
  standalone: true,
  imports: [RouterOutlet, FooterComponent],
  templateUrl: './marketing-layout.component.html',
})
export class MarketingLayoutComponent {}
