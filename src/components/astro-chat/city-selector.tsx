'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { LocationAutocomplete } from '@/components/ui/location-autocomplete';
import type { ChatCity } from '@/lib/chat-city-context';

const copy: Record<string, {title:string; context:string; hint:string; placeholder:string; remove:string; limit:string; add:string; ready:string}> = {
  en: {title:'Choose a city',context:'For questions about a specific city',hint:'Search and select a city here, then write your question below. Selecting cities uses no credits.',placeholder:'Search a city, e.g. Haifa or Milan',remove:'Remove',limit:'3 cities selected. Remove one to choose another.',add:'Add city',ready:'Selected for your next question'},
  zh: {title:'选择城市',context:'分析具体城市时使用',hint:'这里只搜索并选择城市，请在下方输入问题。选择城市不消耗积分。',placeholder:'搜索城市，如海法、米兰',remove:'移除',limit:'已选3座城市，请先移除一座再添加。',add:'添加城市',ready:'下次提问将使用这些城市的计算依据'},
  de: {title:'Stadt auswählen',context:'Für Fragen zu einer bestimmten Stadt',hint:'Hier eine Stadt suchen und auswählen. Deine Frage schreibst du unten. Die Auswahl kostet keine Credits.',placeholder:'Stadt suchen, z. B. Haifa oder Mailand',remove:'Entfernen',limit:'3 Städte ausgewählt. Entferne eine, um eine weitere hinzuzufügen.',add:'Stadt hinzufügen',ready:'Für deine nächste Frage ausgewählt'},
  es: {title:'Elegir ciudad',context:'Para preguntas sobre una ciudad concreta',hint:'Aquí busca y selecciona una ciudad; escribe tu pregunta abajo. Elegir ciudades no consume créditos.',placeholder:'Busca una ciudad, como Haifa o Milán',remove:'Quitar',limit:'Ya seleccionaste 3 ciudades. Quita una para añadir otra.',add:'Añadir ciudad',ready:'Seleccionadas para tu próxima pregunta'},
  pt: {title:'Escolher cidade',context:'Para perguntas sobre uma cidade específica',hint:'Aqui, busque e selecione uma cidade; escreva sua pergunta abaixo. Escolher cidades não gasta créditos.',placeholder:'Busque uma cidade, como Haifa ou Milão',remove:'Remover',limit:'Você selecionou 3 cidades. Remova uma para adicionar outra.',add:'Adicionar cidade',ready:'Selecionadas para sua próxima pergunta'},
  it: {title:'Scegli una città',context:'Per domande su una città specifica',hint:'Qui cerca e seleziona una città; scrivi la domanda qui sotto. Scegliere le città non consuma crediti.',placeholder:'Cerca una città, ad esempio Haifa o Milano',remove:'Rimuovi',limit:'Hai selezionato 3 città. Rimuovine una per aggiungerne un’altra.',add:'Aggiungi città',ready:'Selezionate per la prossima domanda'},
};

export default function ChatCitySelector({cities,onChange,locale,disabled}: {
  cities:ChatCity[]; onChange:(cities:ChatCity[])=>void; locale:string; disabled:boolean;
}) {
  const [query,setQuery]=useState('');
  const [searchOpen,setSearchOpen]=useState(false);
  const searchId=useId();
  const panelId=`${searchId}-panel`;
  const triggerRef=useRef<HTMLButtonElement>(null);
  const text=copy[locale.toLowerCase().split(/[-_]/)[0]]||copy.en;
  useEffect(()=>{
    if(searchOpen && !disabled) document.getElementById(searchId)?.focus();
  },[searchOpen,searchId,disabled]);
  return (
    <section aria-label={text.title} className="mb-3 text-sm text-gray-200">
      <fieldset disabled={disabled} className="min-w-0 space-y-2" onKeyDown={event=>{
        if(event.key==='Enter' && (event.target as HTMLElement).tagName==='INPUT') event.preventDefault();
        if(event.key==='Escape' && searchOpen){event.preventDefault();event.stopPropagation();setSearchOpen(false);triggerRef.current?.focus();}
      }}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <button ref={triggerRef} type="button" disabled={disabled || cities.length>=3}
            aria-expanded={searchOpen} aria-controls={panelId}
            onClick={()=>setSearchOpen(open=>!open)}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-2.5 py-1.5 text-xs font-medium text-purple-200 hover:bg-white/5 disabled:opacity-50">
            <MapPin aria-hidden="true" className="size-3.5" />
            {cities.length ? `${text.add} (${cities.length}/3)` : text.title}
            <ChevronDown aria-hidden="true" className={`size-3 transition-transform ${searchOpen ? 'rotate-180' : ''}`} />
          </button>
          {cities.length===0 && <span className="text-xs text-gray-400">{text.context}</span>}
        </div>
        <div id={panelId} hidden={!searchOpen}>
        {searchOpen && cities.length<3 && <div className="space-y-2 rounded-lg border border-white/15 bg-white/[0.025] px-3 py-2">
        <p className="text-xs leading-relaxed text-gray-400">{text.hint}</p>
        <label htmlFor={searchId} className="sr-only">{text.title}</label>
        <LocationAutocomplete id={searchId} placement="above" value={query} onChange={setQuery} placeholder={text.placeholder} disabled={disabled}
          onSelect={result=>{
            const city={name:result.name,country:result.country,lat:result.coordinates.latitude,lng:result.coordinates.longitude};
            if (!Number.isFinite(city.lat)||!Number.isFinite(city.lng)||!city.name) return;
            if (!cities.some(c=>Math.abs(c.lat-city.lat)<0.00001 && Math.abs(c.lng-city.lng)<0.00001)) onChange([...cities,city]);
            setQuery('');
            setSearchOpen(false);
            triggerRef.current?.focus();
          }} />
        </div>}
        </div>
        {cities.length===3 && <p className="text-xs text-gray-400">{text.limit}</p>}
        {cities.length>0 && <div aria-live="polite">
          <span className="sr-only">{text.ready}</span>
          <div className="flex flex-wrap gap-2">
          {cities.map((city,index)=><button type="button" key={`${city.lat}:${city.lng}`} disabled={disabled}
            className="max-w-full rounded-full border border-purple-400/40 px-2 py-1 text-left text-xs disabled:opacity-50"
            aria-label={`${text.remove}: ${city.name}, ${city.country}`}
            onClick={()=>onChange(cities.filter((_,i)=>i!==index))}>{city.name}, {city.country} ×</button>)}
          </div>
        </div>}
      </fieldset>
    </section>
  );
}
