'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function criarImovel(formData: FormData): Promise<void> {
  try {
    const supabase = await createClient()

    const proprietarioRaw = formData.get('proprietario_id') as string
    const proprietario_id = proprietarioRaw && proprietarioRaw.trim() !== '' ? proprietarioRaw : null

    const payload = {
      codigo: formData.get('codigo') as string,
      proprietario_id,
      tipo: (formData.get('tipo') as string) || 'Residencial',
      finalidade: (formData.get('finalidade') as string) || 'Residencial',
      status: (formData.get('status') as string) || 'Disponível',
      cep: (formData.get('cep') as string) || null,
      logradouro: formData.get('logradouro') as string,
      numero: (formData.get('numero') as string) || null,
      complemento: (formData.get('complemento') as string) || null,
      bairro: (formData.get('bairro') as string) || null,
      cidade: formData.get('cidade') as string,
      uf: formData.get('uf') as string,
      area_total: formData.get('area_total') ? parseFloat(formData.get('area_total') as string) : null,
      area_util: formData.get('area_util') ? parseFloat(formData.get('area_util') as string) : null,
      valor_aluguel: parseFloat((formData.get('valor_aluguel') as string) || '0'),
      valor_condominio: formData.get('valor_condominio') ? parseFloat(formData.get('valor_condominio') as string) : 0,
      iptu_mensal: formData.get('iptu_mensal') ? parseFloat(formData.get('iptu_mensal') as string) : 0,
      matricula: (formData.get('matricula') as string) || null,
      observacoes: (formData.get('observacoes') as string) || null,
    }

    const { error } = await supabase.from('imoveis').insert([payload])

    if (error) {
      console.error('Erro ao cadastrar imóvel:', error.message)
      return
    }

    revalidatePath('/imoveis')
  } catch (err) {
    console.error('Erro na action criarImovel:', err)
  }
}