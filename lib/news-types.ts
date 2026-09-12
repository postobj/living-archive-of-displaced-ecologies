export interface NewsEvent {
  id: string;
  dateLabel: string;
  title: string;
  description: string[];
  link?: string;
  linkLabel?: string;
  posterImage?: string;
  posterVideo?: string;
  time?: string;
  endTime?: string;
  location?: string;
  category?: string;
  admission?: string;
}

export interface NewsMonth {
  month: number;
  items: NewsEvent[];
}

export interface NewsYearData {
  year: number;
  months: NewsMonth[];
}
