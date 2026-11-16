export interface DriverReview {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  userName: string;
  cargoLoadOrder: string | null;
}