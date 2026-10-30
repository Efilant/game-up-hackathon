import { describe,it,expect } from 'vitest';
import {calculateImpact,baselineResult,DEFENSES} from './simulation';
describe('Savunma bileşimlerinin değişmezleri',()=>{
  it('bütçeye uyan her bileşim deterministik, sıralamadan bağımsız ve sınırlı güvenlik üretir',()=>{
    for(let mask=0;mask<16;mask++){
      const ids=DEFENSES.filter((_,i)=>mask&(1<<i)).map(d=>d.id);
      const result=calculateImpact(ids);
      if(result.budgetUsed>100)continue;
      expect(calculateImpact([...ids].reverse())).toEqual(result);
      expect(calculateImpact(ids)).toEqual(result);
      for(const [i,d] of result.districts.entries()){
        expect(d.damage).toBeLessThanOrEqual(baselineResult.districts[i].damage);
        expect(d.safety).toBeGreaterThanOrEqual(0);
        expect(d.safety).toBeLessThanOrEqual(100);
      }
    }
  });
  it('uyarı eklenmesi hiçbir bileşimde fiziksel su/hasar görünümünü değiştirmemelidir',()=>{
    for(const ids of [[],['sünger'],['set'],['dönüşüm']] as const){
      const before=calculateImpact([...ids]);const after=calculateImpact([...ids,'uyarı']);
      expect(after.districts.map(d=>d.damage)).toEqual(before.districts.map(d=>d.damage));
      expect(after.safety).toBeGreaterThan(before.safety);
    }
  });
});
