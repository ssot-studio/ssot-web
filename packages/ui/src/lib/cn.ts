import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 클래스 병합 유틸. clsx 로 조건부 클래스를 합치고 tailwind-merge 로 충돌을 해소한다.
 * CVA 결과 + 호출부 className 을 합칠 때 사용한다.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
