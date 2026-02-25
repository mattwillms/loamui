import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, LayoutGrid, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useGardens, useCreateGarden } from '@/api/gardens'

export function GardensPage() {
  const navigate = useNavigate()
  const { data: gardens, isLoading } = useGardens()
  const createGarden = useCreateGarden()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    await createGarden.mutateAsync({ name: name.trim(), description: description.trim() || undefined })
    setName('')
    setDescription('')
    setOpen(false)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-foreground">Gardens</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your garden spaces.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New garden
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading…</p>
      )}

      {!isLoading && gardens && gardens.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-4">
              <LayoutGrid className="h-8 w-8 text-primary/60" />
            </div>
            <h2 className="text-base font-medium text-foreground">No gardens yet</h2>
            <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
              Create your first garden to start tracking beds and plantings.
            </p>
            <Button className="mt-6" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add your first garden
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && gardens && gardens.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gardens.map((garden) => (
            <Card
              key={garden.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate(`/gardens/${garden.id}`)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-medium">{garden.name}</CardTitle>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {garden.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{garden.description}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {garden.sun_exposure && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {garden.sun_exposure}
                    </span>
                  )}
                  {garden.square_footage && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {garden.square_footage} sq ft
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New garden</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="garden-name">Name</Label>
              <Input
                id="garden-name"
                placeholder="e.g. Backyard raised beds"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="garden-description">Description (optional)</Label>
              <Input
                id="garden-description"
                placeholder="A short description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createGarden.isPending}>
                {createGarden.isPending ? 'Creating…' : 'Create garden'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
