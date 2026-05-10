import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Users, ImageIcon, Ticket, ChevronRight,
  ChevronLeft, Plus, Trash2, Upload, Info, Check, Globe,
  Music, Mic2, Trophy, Laptop, Map, Loader2, X
} from 'lucide-react';
import { cn } from '../lib/utils';

// ── Validation Schema ─────────────────────────────────────────────────────────

const attractionSchema = z.object({
  name: z.string().min(1, 'Nome da atração é obrigatório'),
  time: z.string().min(1, 'Horário é obrigatório'),
  description: z.string().optional(),
});

const ticketTierSchema = z.object({
  name: z.string().min(1, 'Nome do lote é obrigatório'),
  price: z.number().min(0, 'O preço deve ser maior ou igual a zero'),
  capacity: z.number().min(1, 'A capacidade deve ser de pelo menos 1'),
});

const eventSchema = z.object({
  // Step 1
  name: z.string().min(5, 'O nome deve ter pelo menos 5 caracteres'),
  category: z.string().min(1, 'Selecione uma categoria'),
  description: z.string().min(20, 'Forneça uma descrição mais detalhada'),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  end_date: z.string().min(1, 'Data de término é obrigatória'),

  // Step 2
  type: z.enum(['presencial', 'online']),
  location_name: z.string().optional(),
  cep: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  online_link: z.string().url('URL inválida').optional().or(z.literal('')),

  // Step 3
  attractions: z.array(attractionSchema).min(1, 'Adicione pelo menos uma atração'),

  // Step 4
  banner_url: z.string().optional(),
  logo_url: z.string().optional(),

  // Step 5
  tickets: z.array(ticketTierSchema).min(1, 'Adicione pelo menos um tipo de ingresso'),
});

type EventFormData = z.infer<typeof eventSchema>;

// ── Components ────────────────────────────────────────────────────────────────

interface StepProps {
  register: any;
  control: any;
  errors: any;
  watch: any;
  setValue: any;
}

const steps = [
  { id: 1, title: 'Básico', icon: Info },
  { id: 2, title: 'Local', icon: MapPin },
  { id: 3, title: 'Line-up', icon: Mic2 },
  { id: 4, title: 'Visual', icon: ImageIcon },
  { id: 5, title: 'Ingressos', icon: Ticket },
];

export function EventWizard({ onClose, onSuccess }: { onClose: () => void, onSuccess: (data: any) => void }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      type: 'presencial',
      attractions: [{ name: '', time: '', description: '' }],
      tickets: [{ name: 'Lote Único', price: 0, capacity: 100 }],
    },
  });

  const eventType = watch('type');

  const nextStep = async () => {
    // Validate current step fields before moving forward
    let fieldsToValidate: any[] = [];
    if (currentStep === 1) fieldsToValidate = ['name', 'category', 'description', 'start_date', 'end_date'];
    if (currentStep === 2) {
      fieldsToValidate = ['type'];
      if (eventType === 'presencial') fieldsToValidate.push('location_name', 'cep', 'address', 'city', 'state');
      else fieldsToValidate.push('online_link');
    }
    if (currentStep === 3) fieldsToValidate = ['attractions'];
    if (currentStep === 5) fieldsToValidate = ['tickets'];

    const isValid = await trigger(fieldsToValidate as any);
    if (isValid) setCurrentStep((prev) => Math.min(prev + 1, 5));
  };

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      onSuccess(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCEP = async (cep: string) => {
    if (cep.replace(/\D/g, '').length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setValue('address', data.logradouro);
          setValue('neighborhood', data.bairro);
          setValue('city', data.localidade);
          setValue('state', data.uf);
        }
      } catch (e) {
        console.error('ViaCEP error', e);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-zinc-950 w-full max-w-5xl h-[90vh] flex flex-col md:flex-row overflow-hidden rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800"
      >
        {/* Sidebar Stepper */}
        <div className="w-full md:w-80 bg-zinc-50 dark:bg-zinc-900/50 border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 p-8 flex flex-col">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Calendar className="text-white" size={20} />
            </div>
            <div>
              <h2 className="font-black text-zinc-900 dark:text-white tracking-tight uppercase text-sm">Criar Evento</h2>
              <p className="text-xs text-zinc-500 font-bold">WIZARD v2.0</p>
            </div>
          </div>

          <nav className="flex md:flex-col gap-2 md:gap-4 flex-1">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isPast = currentStep > step.id;

              return (
                <button
                  key={step.id}
                  onClick={() => isPast && setCurrentStep(step.id)}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-3xl transition-all text-left group",
                    isActive 
                      ? "bg-white dark:bg-zinc-900 shadow-xl shadow-zinc-200/50 dark:shadow-none border border-zinc-200 dark:border-zinc-700" 
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-2xl flex items-center justify-center transition-all",
                    isActive ? "bg-emerald-500 text-white scale-110" : isPast ? "bg-emerald-100 text-emerald-600" : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
                  )}>
                    {isPast ? <Check size={18} strokeWidth={3} /> : <Icon size={18} />}
                  </div>
                  <div className="hidden md:block">
                    <p className={cn("text-xs font-bold uppercase tracking-widest", isActive ? "text-emerald-500" : "text-zinc-400")}>PASSO {step.id}</p>
                    <p className={cn("font-black text-sm", isActive ? "text-zinc-900 dark:text-white" : "text-zinc-500")}>{step.title}</p>
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto hidden md:block">
            <div className="p-5 rounded-3xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 leading-relaxed font-medium">
                Seu evento será publicado instantaneamente após a conclusão.
              </p>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 overflow-hidden relative">
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 z-10 p-2 rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>

          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto px-8 md:px-16 pt-20 pb-32">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <Step1 key="step1" register={register} errors={errors} />
              )}
              {currentStep === 2 && (
                <Step2 
                  key="step2" 
                  register={register} 
                  errors={errors} 
                  watch={watch} 
                  handleCEP={handleCEP} 
                />
              )}
              {currentStep === 3 && (
                <Step3 key="step3" control={control} register={register} errors={errors} />
              )}
              {currentStep === 4 && (
                <Step4 key="step4" />
              )}
              {currentStep === 5 && (
                <Step5 key="step5" control={control} register={register} errors={errors} />
              )}
            </AnimatePresence>
          </form>

          {/* Footer Navigation */}
          <div className="absolute bottom-0 left-0 right-0 p-8 md:px-16 bg-gradient-to-t from-white dark:from-zinc-950 via-white dark:via-zinc-950 to-transparent flex items-center justify-between pointer-events-none">
            <div className="flex gap-4 pointer-events-auto">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all"
                >
                  <ChevronLeft size={20} /> Voltar
                </button>
              )}
            </div>

            <div className="pointer-events-auto">
              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center gap-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-8 py-4 rounded-3xl font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-xl shadow-zinc-900/20"
                >
                  Continuar <ChevronRight size={20} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 bg-emerald-500 text-white px-10 py-4 rounded-3xl font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-xl shadow-emerald-500/30 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                  Publicar Evento
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Step 1: Informações Básicas ────────────────────────────────────────────────

function Step1({ register, errors }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">O que vamos celebrar?</h3>
        <p className="text-zinc-500">Defina o nome e a alma do seu evento.</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Nome do Evento</label>
          <input
            {...register('name')}
            placeholder="Ex: Noite de Gala Multiloja"
            className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-lg font-bold focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all dark:text-white"
          />
          {errors.name && <p className="text-red-500 text-xs mt-2 font-bold">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Categoria</label>
            <select
              {...register('category')}
              className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold focus:outline-none dark:text-white"
            >
              <option value="">Selecione...</option>
              <option value="show">Show / Concerto</option>
              <option value="workshop">Workshop</option>
              <option value="palestra">Palestra</option>
              <option value="esporte">Esporte</option>
              <option value="corporativo">Corporativo</option>
            </select>
            {errors.category && <p className="text-red-500 text-xs mt-2 font-bold">{errors.category.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Descrição</label>
          <textarea
            {...register('description')}
            rows={5}
            placeholder="Conte um pouco mais sobre o que vai acontecer..."
            className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm font-medium focus:outline-none dark:text-white resize-none"
          />
          {errors.description && <p className="text-red-500 text-xs mt-2 font-bold">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Início</label>
            <input
              type="datetime-local"
              {...register('start_date')}
              className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold focus:outline-none dark:text-white dark:[color-scheme:dark]"
            />
            {errors.start_date && <p className="text-red-500 text-xs mt-2 font-bold">{errors.start_date.message}</p>}
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Término</label>
            <input
              type="datetime-local"
              {...register('end_date')}
              className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold focus:outline-none dark:text-white dark:[color-scheme:dark]"
            />
            {errors.end_date && <p className="text-red-500 text-xs mt-2 font-bold">{errors.end_date.message}</p>}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Step 2: Localização e Estrutura ───────────────────────────────────────────

function Step2({ register, errors, watch, handleCEP }: any) {
  const type = watch('type');

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Onde será o encontro?</h3>
        <p className="text-zinc-500">Escolha entre um local físico ou uma experiência digital.</p>
      </div>

      <div className="flex gap-4 mb-10">
        {[
          { value: 'presencial', label: 'Presencial', icon: Globe },
          { value: 'online', label: 'Online', icon: Laptop },
        ].map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex-1 flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 cursor-pointer transition-all",
              type === opt.value
                ? "bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:border-white dark:text-zinc-900"
                : "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500"
            )}
          >
            <input type="radio" value={opt.value} {...register('type')} className="hidden" />
            <opt.icon size={28} />
            <span className="font-black text-sm uppercase tracking-widest">{opt.label}</span>
          </label>
        ))}
      </div>

      {type === 'presencial' ? (
        <div className="grid grid-cols-6 gap-6">
          <div className="col-span-6">
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Nome do Local</label>
            <input
              {...register('location_name')}
              placeholder="Ex: Allianz Parque"
              className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold focus:outline-none dark:text-white"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">CEP</label>
            <input
              {...register('cep')}
              placeholder="00000-000"
              onChange={(e) => handleCEP(e.target.value)}
              className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold focus:outline-none dark:text-white"
            />
          </div>
          <div className="col-span-4">
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Endereço (Rua)</label>
            <input
              {...register('address')}
              className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold focus:outline-none dark:text-white"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Número</label>
            <input
              {...register('number')}
              className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold focus:outline-none dark:text-white"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Cidade</label>
            <input
              {...register('city')}
              className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold focus:outline-none dark:text-white"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Estado</label>
            <input
              {...register('state')}
              className="w-full px-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold focus:outline-none dark:text-white"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-2">Link da Transmissão</label>
            <div className="relative">
              <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input
                {...register('online_link')}
                placeholder="https://zoom.us/j/..."
                className="w-full pl-12 pr-5 py-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl font-bold focus:outline-none dark:text-white"
              />
            </div>
            {errors.online_link && <p className="text-red-500 text-xs mt-2 font-bold">{errors.online_link.message}</p>}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ── Step 3: Atrações e Line-up ────────────────────────────────────────────────

function Step3({ control, register, errors }: any) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'attractions',
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Quem sobe ao palco?</h3>
        <p className="text-zinc-500">Adicione as estrelas do seu line-up.</p>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div 
            key={field.id}
            className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] relative group"
          >
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="md:col-span-3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Nome da Atração</label>
                <input
                  {...register(`attractions.${index}.name`)}
                  placeholder="Ex: Dj Gustavo"
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold focus:outline-none dark:text-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Horário</label>
                <input
                  type="time"
                  {...register(`attractions.${index}.time`)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold focus:outline-none dark:text-white dark:[color-scheme:dark]"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="p-2.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => append({ name: '', time: '', description: '' })}
          className="w-full py-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 transition-all flex flex-col items-center gap-2 group"
        >
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus size={20} />
          </div>
          <span className="font-bold text-sm uppercase tracking-widest">Adicionar Atração</span>
        </button>
      </div>
    </motion.div>
  );
}

// ── Step 4: Identidade Visual ─────────────────────────────────────────────────

function Step4() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Identidade Visual</h3>
        <p className="text-zinc-500">Cores e imagens que dão vida ao evento.</p>
      </div>

      <div className="space-y-8">
        <div>
          <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Banner Principal (16:9)</label>
          <div className="aspect-[21/9] bg-zinc-50 dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group">
            <div className="w-16 h-16 rounded-3xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:scale-110 transition-transform">
              <Upload size={24} />
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Enviar Banner</p>
              <p className="text-[10px] text-zinc-500 mt-1 font-bold">JPG ou PNG, Recomendado: 1920x1080</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">Logo do Evento (1:1)</label>
            <div className="w-40 h-40 bg-zinc-50 dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group">
              <ImageIcon size={20} className="text-zinc-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Logo</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Step 5: Ingressos e Lotes ─────────────────────────────────────────────────

function Step5({ control, register }: any) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'tickets',
  });

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      <div className="space-y-2">
        <h3 className="text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Ingressos e Lotes</h3>
        <p className="text-zinc-500">Defina como o público poderá acessar o evento.</p>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div 
            key={field.id}
            className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] relative group"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-5">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Nome do Lote</label>
                <input
                  {...register(`tickets.${index}.name`)}
                  placeholder="Ex: Entrada VIP"
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold focus:outline-none dark:text-white"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Preço (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  {...register(`tickets.${index}.price`, { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold focus:outline-none dark:text-white"
                />
              </div>
              <div className="md:col-span-3">
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Capacidade</label>
                <input
                  type="number"
                  {...register(`tickets.${index}.capacity`, { valueAsNumber: true })}
                  className="w-full px-4 py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold focus:outline-none dark:text-white"
                />
              </div>
              <div className="md:col-span-1 flex items-end justify-center">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="p-2 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={() => append({ name: '', price: 0, capacity: 50 })}
          className="w-full py-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-[2rem] text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:border-zinc-400 transition-all flex flex-col items-center gap-2"
        >
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
            <Plus size={20} />
          </div>
          <span className="font-bold text-sm uppercase tracking-widest">Novo Tipo de Ingresso</span>
        </button>
      </div>
    </motion.div>
  );
}
