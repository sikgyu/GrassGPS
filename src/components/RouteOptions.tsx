import React from 'react';
import { usePlaces } from '../hooks/usePlaces';
import { RouteOptions as RouteOptionsType } from '../types';

export const RouteOptions: React.FC = () => {
  const { places, routeOptions, setRouteOptions } = usePlaces();

  const handleOptionChange = (key: keyof RouteOptionsType, value: any) => {
    setRouteOptions({ [key]: value });
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
      <div>
        <label className="block text-sm font-medium text-gray-700">시작 지점</label>
        <select
          value={routeOptions.startPoint}
          onChange={(e) => handleOptionChange('startPoint', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="current">현재 위치</option>
          {places.map((place) => (
            <option key={place.id} value={place.id}>
              {place.addr}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">도착 지점</label>
        <select
          value={routeOptions.endPoint}
          onChange={(e) => handleOptionChange('endPoint', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="current">현재 위치</option>
          <option value="start">시작 지점</option>
          {places.map((place) => (
            <option key={place.id} value={place.id}>
              {place.addr}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">첫 방문지</label>
        <select
          value={routeOptions.mustVisitFirst || ''}
          onChange={(e) => handleOptionChange('mustVisitFirst', e.target.value || undefined)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="">선택 안함</option>
          {places.map((place) => (
            <option key={place.id} value={place.id}>
              {place.addr}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">경로 최적화</label>
        <select
          value={routeOptions.scenario}
          onChange={(e) => handleOptionChange('scenario', e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="nearest">가까운 순서</option>
          <option value="farthest">먼 순서</option>
          <option value="roundTrip">왕복</option>
          <option value="custom">사용자 지정</option>
        </select>
      </div>
    </div>
  );
}; 