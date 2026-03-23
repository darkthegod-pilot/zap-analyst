# Design System — DarkCred ZAP Analyst

## Intent

**Who:** Gerente de escritório de empréstimos verificando comprovantes bancários no celular ao longo do dia — entre reuniões, no escritório, às vezes após o expediente.

**What:** Escanear rapidamente os comprovantes de hoje, identificar suspeitos, aprovar/rejeitar com confiança baseada nos dados extraídos pela IA.

**Feel:** *"Denso como um terminal bancário. Frio como um sistema de segurança. Preciso como uma ferramenta forense."* — Não é caloroso nem amigável. É autoritativo, clínico, confiável.

---

## Direction

**Personality:** Sophistication & Trust + Data & Analysis
**Foundation:** Cool navy-black (confiança financeira)
**Depth:** Layered shadows (premium, cartões com presença real)
**Spacing base:** 4px — denso, otimizado para dados

---

## Domain Exploration

**Domain concepts:** Comprovantes bancários, análise de fraude, autenticação de documentos, monitoramento de clientes, aprovação/rejeição de crédito, segurança financeira

**Color world:** Tinta em papel (preto sobre branco), threads de segurança fluorescentes, monitor de câmera de segurança (azul frio), cofre (cinza aço escuro), carimbo "REJEITADO" (vermelho), check mark "APROVADO" (verde)

**Signature element:** O arco circular de confiança — medidor de autenticidade estilo gauge forense. Só existiria neste produto específico.

**Defaults rejeitados:**
- ~~Neon `#00ff88` em fundo preto~~ → Esmeralda muto `#10B981` em navy-black (menos crypto, mais financeiro)
- ~~Barra de progresso horizontal para score~~ → Arco circular SVG com glow
- ~~Cards com border-radius grande (16px+)~~ → Radius 10px — técnico, preciso

---

## Tokens

### Colors

```css
/* Surfaces */
--canvas:  #080D18     /* Base: deep navy-black */
--panel:   #0D1525     /* Cards e painéis */
--raised:  #121D35     /* Elementos elevados */
--hover:   #172240     /* Hover state */
--overlay: #1E2D4F     /* Dropdowns */

/* Borders (blue-tinted rgba — nunca hex sólido) */
--border:        rgba(100,150,255,0.07)
--border-subtle: rgba(100,150,255,0.04)
--border-strong: rgba(100,150,255,0.13)
--border-brand:  rgba(16,185,129,0.28)

/* Text hierarchy (4 levels) */
--ink:   #E8EEF8     /* Primary — slightly cool white */
--ink2:  #7A8DB5     /* Secondary */
--ink3:  #3D4E72     /* Muted */
--ink4:  #1E2D4F     /* Faint/disabled */

/* Brand */
--brand:     #10B981     /* Muted emerald */
--brand-hi:  #34D399     /* Hover / highlights */
--brand-bg:  rgba(16,185,129,0.10)
--brand-bdr: rgba(16,185,129,0.25)

/* Status */
--ok:      #10B981    --ok-bg:  rgba(16,185,129,0.10)   --ok-bdr:  rgba(16,185,129,0.20)
--warn:    #F59E0B    --warn-bg:rgba(245,158,11,0.10)   --warn-bdr:rgba(245,158,11,0.20)
--danger:  #EF4444    --danger-bg:rgba(239,68,68,0.10) --danger-bdr:rgba(239,68,68,0.20)
--idle:    #4B5E8A    --idle-bg: rgba(75,94,138,0.10)   --idle-bdr: rgba(75,94,138,0.20)
```

### Shadows (layered — premium financial)

```css
--shadow-sm: 0 0 0 0.5px rgba(100,150,255,0.06), 0 1px 2px rgba(0,0,0,0.5)
--shadow-md: 0 0 0 0.5px rgba(100,150,255,0.07), 0 2px 6px rgba(0,0,0,0.45), 0 8px 20px rgba(0,0,0,0.25)
--shadow-ok: 0 0 0 0.5px rgba(16,185,129,0.25), 0 2px 6px rgba(0,0,0,0.4), 0 0 20px rgba(16,185,129,0.08)
--shadow-warn: 0 0 0 0.5px rgba(245,158,11,0.25), 0 2px 6px rgba(0,0,0,0.4), 0 0 20px rgba(245,158,11,0.08)
--shadow-danger: 0 0 0 0.5px rgba(239,68,68,0.25), 0 2px 6px rgba(0,0,0,0.4), 0 0 20px rgba(239,68,68,0.08)
```

### Radius

- `4px` — tags, badges
- `6px` — chips, pills, botões pequenos
- `8px` — botões, inputs
- `10px` — cards (elemento principal)
- `12px` — popovers
- `16px` — bottom sheets, modais

### Typography

```
Font:  Inter (UI) + JetBrains Mono (números, IDs, telefones)
Scale: 10, 11, 12, 13 (base), 14, 15, 18
Weights: 400, 500, 600, 700, 800, 900
Monospace: font-variant-numeric: tabular-nums, lining-nums
```

---

## Patterns

### Card
```
background: #0D1525
box-shadow: layered (shadow-md)
border-radius: 10px
padding: 12px (p-3)
```

### Button primary
```
background: #10B981 (brand)
color: #080D18
border-radius: 8px
height: 40px (h-10)
font: 13px, 600
```

### Button ghost
```
background: rgba(100,150,255,0.05)
box-shadow: 0 0 0 0.5px rgba(100,150,255,0.10)
border-radius: 6px
height: 32px
color: ink2
```

### Status badge
```
Formato: [dot] [LABEL]
Dot com box-shadow glow na cor do status
Border-radius: 99px (pill)
Font: 10px, 700, uppercase, tracking-wide
```

### Confidence Arc (SIGNATURE)
```
SVG circle com stroke-dasharray
Raio: 19px, stroke: 2.5px
Gap de 22% na base do arco
Cor dinâmica: ok ≥85%, warn ≥55%, danger <55%
filter: drop-shadow com glow na cor
Transição: 0.8s cubic-bezier(0.34,1.56,0.64,1)
Centro: número + "%" em JetBrains Mono
```

### Chip/Filter
```
Padding: 6px 12px
Border-radius: 99px
Default: rgba(100,150,255,0.05) + 0.5px border
Active: rgba(16,185,129,0.10) + brand border + brand text
Font: 11px, 600, tracking-wide, uppercase
```

### DateFilter
```
Presets: Hoje | Ontem | 7 dias | 30 dias | Tudo | Período
Overflow: scroll horizontal (sem scrollbar visível)
Custom: 2 inputs date + Aplicar + X
Padrão: "Hoje" ao iniciar cada aba
```

### Pagination
```
Mostra: [N–M de Total]
Font: JetBrains Mono, 11px
Botões de página: chips reutilizados
Setas: btn-ghost
```

---

## Decisions

| Decisão | Justificativa | Data |
|---------|---------------|------|
| Navy-black base (#080D18) | Financeiro, confiança, não é crypto | 2026-03-23 |
| Emerald muto (#10B981) vs neon | Mais profissional, menos gaming | 2026-03-23 |
| Layered shadows (não borders-only) | Cards precisam ter presença real — produto premium | 2026-03-23 |
| Arco circular de confiança | Signature unique ao produto — score forense | 2026-03-23 |
| JetBrains Mono para todos números | Dados financeiros precisam de alinhamento tabular | 2026-03-23 |
| 4px spacing base | Densidade de dados — informação compacta | 2026-03-23 |
| Radius 10px para cards | Técnico mas não agressivo | 2026-03-23 |
| Borders blue-tinted rgba | Não harsh — whisper-quiet structure | 2026-03-23 |
