// src/app/shared/components/pagination/pagination.component.ts
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss']
})
export class PaginationComponent implements OnChanges {
  @Input() totalItems: number = 0;
  @Input() pageSize: number = 10;
  @Input() currentPage: number = 1;
  @Output() pageChange = new EventEmitter<number>();

  totalPages: number = 1;
  pages: number[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    this.calculatePages();
  }

  calculatePages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    
    // Create an array of page numbers to display
    this.pages = [];
    const maxPagesToShow = 5; // Show max 5 page numbers

    if (this.totalPages <= maxPagesToShow) {
      // If less than maxPagesToShow pages, show all
      for (let i = 1; i <= this.totalPages; i++) {
        this.pages.push(i);
      }
    } else {
      // Show pages around current page
      let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
      
      // Adjust start page if end page is maxPagesToShow
      if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        this.pages.push(i);
      }
    }
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.pageChange.emit(page);
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.changePage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.changePage(this.currentPage + 1);
    }
  }
}