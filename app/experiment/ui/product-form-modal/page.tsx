'use client';

import { useState } from 'react';
import { ProductFormModal } from '@/components/product/ProductFormModal';
import type { Product } from '@/lib/firestore/productTypes';

type ProductInput = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;

export default function ProductFormModalExperiment() {
  const [isOpen, setIsOpen] = useState(false);
  const [submittedProduct, setSubmittedProduct] = useState<ProductInput | null>(null);

  return (
    <main className="app-page">
      <div className="app-container">
        <h1 className="page-title">Product Form Modal</h1>
        <button type="button" className="app-button-primary" onClick={() => setIsOpen(true)}>
          Open Product Form
        </button>
        {submittedProduct && (
          <pre data-testid="submitted-product">{JSON.stringify(submittedProduct)}</pre>
        )}
        <ProductFormModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSubmit={async product => setSubmittedProduct(product)}
        />
      </div>
    </main>
  );
}
