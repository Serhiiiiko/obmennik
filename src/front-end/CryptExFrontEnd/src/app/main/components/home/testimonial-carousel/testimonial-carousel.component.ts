import {
  Component,
  OnInit,
  OnDestroy
} from '@angular/core';
import {
  trigger,
  transition,
  style,
  animate
} from '@angular/animations';

interface Testimonial {
  author: string;
  date: string;
  text: string;
}

@Component({
  selector: 'app-testimonial-carousel',
  templateUrl: './testimonial-carousel.component.html',
  // Добавляем анимации в метаданные компонента
  animations: [
    trigger('carouselAnimation', [
      // Анимация при переходе currentIndex: 0 -> 1, 1 -> 2 и т.д.
      transition(':increment', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('0.5s ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      // Анимация при переходе currentIndex: 2 -> 1, 1 -> 0 и т.д.
      transition(':decrement', [
        style({ opacity: 0, transform: 'translateX(-100%)' }),
        animate('0.5s ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class TestimonialCarouselComponent implements OnInit, OnDestroy {

  testimonials: Testimonial[] = [
    {
      author: 'Siarheik',
      date: '22.02.2025, 00:45',
      text: 'Очень хороший сервис, я ещё быстрый перевод...'
    },
    {
      author: 'Alexei',
      date: '22.02.2025, 09:00',
      text: 'В очередной раз пользуюсь данным сервисом. Всё прошло...'
    },
    {
      author: 'Sergey',
      date: '23.02.2025, 15:30',
      text: 'Очень удобно! Спасибо!'
    },
    {
      author: 'Nick',
      date: '11.02.2025, 19:03',
      text: 'Максимальный обмен. Всё прошло отлично!'
    },
    {
      author: 'Егор',
      date: '10.02.2025, 09:11',
      text: 'Отлично! Всё прошло на высшем уровне!'
    },
    {
      author: 'Павел',
      date: '05.02.2025, 18:20',
      text: 'Хороший курс и быстрая обработка!'
    },
    {
      author: 'Анастасия',
      date: '01.02.2025, 10:00',
      text: 'Очень удобный интерфейс, все понятно и быстро.'
    },
    {
      author: 'Иван',
      date: '30.01.2025, 21:45',
      text: 'Поддержка отвечает быстро, рекомендую.'
    },
    // Добавляйте нужное количество отзывов...
  ];

  // Текущий индекс "страницы"
  currentIndex = 0;
  // Количество отзывов, которые показываем за раз (2 ряда по 3 = 6)
  pageSize = 6;

  // ID для setInterval (автопрокрутка)
  private intervalId: any;

  ngOnInit(): void {
    // Запуск автопрокрутки
    this.startAutoSlide();
  }

  ngOnDestroy(): void {
    // При уничтожении компонента очищаем таймер
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  // Текущие отзывы (6 штук) для отображения
  get currentTestimonials(): Testimonial[] {
    const startIndex = this.currentIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.testimonials.slice(startIndex, endIndex);
  }

  // Следующая "страница"
  next(): void {
    const maxIndex = Math.ceil(this.testimonials.length / this.pageSize) - 1;
    if (this.currentIndex < maxIndex) {
      this.currentIndex++;
    } else {
      this.currentIndex = 0; // Зацикливание
    }
  }

  // Предыдущая "страница"
  prev(): void {
    const maxIndex = Math.ceil(this.testimonials.length / this.pageSize) - 1;
    if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      this.currentIndex = maxIndex; // Зацикливание
    }
  }

  // Автопрокрутка каждые 3 секунды
  startAutoSlide(): void {
    this.intervalId = setInterval(() => {
      this.next();
    }, 3000);
  }
}
