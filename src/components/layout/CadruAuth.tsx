import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RUTE } from '@/lib/rute'

type Props = {
  titlu: string
  descriere?: string
  children: ReactNode
  subsol?: ReactNode
}

export function CadruAuth({ titlu, descriere, children, subsol }: Props) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-4 py-10">
      <Link to={RUTE.acasa} className="text-xl font-semibold tracking-tight">
        Table<span className="text-primary">X</span>
      </Link>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{titlu}</CardTitle>
          {descriere && <CardDescription>{descriere}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>

      {subsol && <div className="text-sm text-muted-foreground">{subsol}</div>}
    </div>
  )
}
