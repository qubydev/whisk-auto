import React from 'react'
import Image from 'next/image'

export default function Logo() {
    return (
        <Image
            src="/logo.png"
            alt="Logo"
            height={100}
            width={100}
            className='size-8 fixed bottom-10 right-10 border-2 shadow-sm'
        />
    )
}
