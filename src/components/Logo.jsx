import React from 'react'
import Image from 'next/image'

export default function Logo() {
    return (
        <Image
            src="/logo.png"
            alt="Logo"
            height={100}
            width={100}
            className='size-10 fixed bottom-10 right-10 shadow-lg rounded-full p-1 border'
        />
    )
}
